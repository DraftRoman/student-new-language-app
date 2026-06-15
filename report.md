# Pronunciation Check — Module Documentation

**Feature:** Проверка произношения через запись голоса (UC-PRON-01, Speaking v1)
**Source story:** [stories/pronunciation_check_use_case_and_tasks.md](stories/pronunciation_check_use_case_and_tasks.md)
**Status:** Backend + Web frontend реализованы и протестированы.

Учащийся произносит целевой текст вслух → система записывает аудио → распознаёт речь (STT) → сравнивает с эталоном → отдаёт процент совпадения и статус (excellent / passed / retry). Безлимитные повторы.

Ключевые ограничения из стори:
- **Только бесплатный / OSS STT, $0 за запрос** — никаких платных API.
- **End-to-end ≤ 5 с** (p95).
- **Скоринг server-authoritative** — клиент шлёт только аудио, оценку считает сервер.
- **Сырое аудио не хранится** — удаляется после распознавания (в v1 обрабатывается в памяти).

---

## 1. Архитектура

Новый bounded-контекст `speaking` в бэкенде (DDD, 4 слоя — как `placement`/`progress`) + изолированный модуль на фронте.

```
Browser (MediaRecorder)
  │  multipart: audio_file, exercise_id, expected_text, course_lang, task_type, attempt_no
  ▼
POST /api/v1/pronunciation/check   (Bearer-токен)
  ▼  presentation/router.py
     ├─ проверка размера (до декода)         → 400 / 413
     ├─ asyncio.wait_for(executor, 5s) + Semaphore   (E3 timeout → 503)
     ▼  application/use_cases.py
        ├─ SttEngine.transcribe(bytes)        ← Faster-Whisper (infra)
        │     decode→16kHz mono PCM (PyAV) → VAD (Silero) → распознавание
        ├─ ScoringService.score(expected, recognized)   ← чистый домен (WER)
        └─ AttemptRepository.save(...)         ← Supabase (best-effort)
     ▼  analytics (structlog): audio_submitted / stt_completed|failed / pronunciation_scored
  ▼
JSON: { recognized_text, match_pct, status, details, latency_ms }
```

### Поток данных
1. Клиент пишет аудио (`MediaRecorder`, web → обычно WebM/Opus).
2. Отправляет multipart с Bearer-токеном Supabase.
3. Бэкенд проверяет размер **до** декода (защита от DoS).
4. STT (синхронный, CPU-bound) исполняется в threadpool под `asyncio.wait_for(5s)` и семафором.
5. Faster-Whisper декодирует/ресемплит в 16 кГц mono (bundled PyAV), отсекает тишину (Silero-VAD), возвращает текст.
6. `ScoringService` (чистый Python) нормализует, считает `1 − WER` + детали.
7. Результат пишется в Supabase (нефатально), отдаётся клиенту, эмитятся события аналитики.

---

## 2. Технологический стек (всё бесплатное / OSS)

| Слой | Технология | Лицензия / стоимость |
|---|---|---|
| STT-движок | **faster-whisper** (CTranslate2) | MIT, $0/запрос |
| Декод/ресемпл аудио | **PyAV** (внутри faster-whisper) | bundled, без системного ffmpeg |
| Детекция тишины (VAD) | **Silero-VAD** (`vad_filter=True`) | bundled |
| Сравнение текста | **чистый Python** (Левенштейн по словам) | без внешних зависимостей |
| Web framework | FastAPI + uvicorn | существующий стек |
| Multipart | python-multipart | — |
| Хранилище | Supabase (Postgres) | существующий стек |
| Наблюдаемость | structlog | существующий стек |
| Фронт | React 19 + TS, `MediaRecorder` API | существующий стек |

> Изначально рассматривались `jiwer`/`rapidfuzz` для WER — отказались: WER по словам тривиально считается на чистом Python, и это держит доменный слой свободным от зависимостей (правило слоёв DDD).

---

## 3. API-контракт

### `POST /api/v1/pronunciation/check`
Требует `Authorization: Bearer <supabase access_token>`.

**Запрос** (`multipart/form-data`):

| Поле | Тип | Описание |
|---|---|---|
| `audio_file` | file | Записанное аудио (любой формат — декодируется на сервере) |
| `exercise_id` | string | ID упражнения |
| `expected_text` | string | Эталонный текст |
| `course_lang` | string | Язык распознавания (ISO 639-1, напр. `en`/`es`/`ru`; регион отбрасывается) |
| `task_type` | enum | `word` \| `phrase` \| `sentence` (по умолчанию `phrase`) |
| `attempt_no` | int | Номер попытки (по умолчанию 1) |

**Ответ** `200` (JSON):
```json
{
  "recognized_text": "the cat sat",
  "match_pct": 100,
  "status": "excellent",
  "details": {
    "words_matched": 3,
    "missing": [],
    "extra": [],
    "order_score": 1.0
  },
  "latency_ms": 842
}
```

**Коды ответов:**

| Код | Когда | UX |
|---|---|---|
| 200 | Успех (включая E5 «тишина» → `status: retry`) | Показать результат / мотивирующую копию |
| 400 | Битый/недекодируемый звук, пустой `expected_text` | Ошибка ввода |
| 401 | Нет/невалидный токен | Требуется логин |
| 413 | Аудио превышает лимит | «Слишком длинно» |
| 422 | Невалидный `task_type` | — |
| 503 | Таймаут STT (E3) — **повторяемо** | «Попробуйте ещё раз», урок не падает |

### Маппинг статуса (пороги конфигурируемы, по умолчанию 90/75)
- `match_pct ≥ 90` → **excellent**
- `75 ≤ match_pct < 90` → **passed**
- `match_pct < 75` → **retry**

---

## 4. Алгоритм скоринга (server-authoritative)

[backend/app/modules/speaking/domain/services.py](backend/app/modules/speaking/domain/services.py) — чистый Python, без I/O.

1. **Нормализация** (language-aware): NFC, lowercase, убрать пунктуацию, схлопнуть пробелы. Диакритика сохраняется (фонемна для es/ru).
2. **Выравнивание по словам** — Левенштейн с backtrace → `edit_distance` и число точных совпадений по позициям.
3. **`match_pct = round((1 − WER) × 100)`**, clamp [0, 100], где `WER = edit_distance / len(expected)`.
4. **`missing` / `extra`** — multiset-разница (что пропущено / добавлено, без учёта порядка).
5. **`order_score` (0–1)** — доля совпавших слов, оказавшихся в правильном порядке (ловит перестановку, даже когда все слова на месте).
6. **Статус** по конфигурируемым порогам.

Примеры:
| expected | recognized | match_pct | детали |
|---|---|---|---|
| `the cat sat` | `the cat sat` | 100 | excellent |
| `the cat sat` | `the dog sat` | 67 | missing=[cat], extra=[dog] |
| `a b c` | `a c b` | 33 | missing=[], extra=[], order_score≈0.33 |
| `the cat sat` | `` (тишина, E5) | 0 | retry + «не расслышали» |

---

## 5. Модель данных

Миграция: [backend/migrations/002_pronunciation_attempts.sql](backend/migrations/002_pronunciation_attempts.sql)
**Применение:** Supabase Studio → SQL Editor → вставить и выполнить (идемпотентна).

Таблица `pronunciation_attempts` — **append-only история** (каждая попытка = иммутабельный INSERT). **Сырое аудио не хранится** — только score + метаданные.

| Колонка | Тип | Примечание |
|---|---|---|
| `id` | BIGSERIAL PK | |
| `user_id` | UUID → auth.users | ON DELETE CASCADE |
| `exercise_id` | TEXT | |
| `course_lang` | TEXT | |
| `task_type` | TEXT | CHECK word/phrase/sentence |
| `expected_text`, `recognized_text` | TEXT | |
| `match_pct` | INT | CHECK 0–100 |
| `status` | TEXT | CHECK excellent/passed/retry |
| `words_matched` | INT | |
| `order_score` | REAL | CHECK 0–1 |
| `missing`, `extra` | TEXT[] | |
| `attempt_no` | INT | CHECK ≥ 1 |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

RLS включён; политика owner-select (`auth.uid() = user_id`). Запись — через service-role (бэкенд).

---

## 6. Аналитика (story §5)

**Бэкенд** ([infrastructure/analytics.py](backend/app/modules/speaking/infrastructure/analytics.py), structlog):
- `audio_submitted` — `exercise_id, file_size_bytes, format`
- `stt_completed` — `latency_ms, model, recognized_len`
- `stt_failed` — `reason` ∈ {timeout, error, no_speech}
- `pronunciation_scored` — `match_pct, status, attempt_no`

> В логи не попадают аудио и текст транскрипта (без PII).

**Фронтенд** ([lib/analytics.ts](frontend/src/lib/analytics.ts), `track()`):
- `speaking_exercise_shown`, `mic_permission_requested|granted|denied`, `recording_started|stopped|deleted|rerecorded`, `speaking_exercise_completed`

Guardrail-метрика латентности наблюдаема через `stt_completed.latency_ms` и `latency_ms` в ответе.

---

## 7. Конфигурация (backend)

[backend/app/config.py](backend/app/config.py) — переменные окружения (pydantic-settings):

| Настройка | Default | Назначение |
|---|---|---|
| `STT_MODEL_SIZE` | `base` | tiny/base/small/medium (латентность ↔ точность) |
| `STT_DEVICE` | `cpu` | `cuda` при наличии GPU |
| `STT_COMPUTE_TYPE` | `int8` | int8 (CPU) / float16 (GPU) |
| `STT_BEAM_SIZE` | `1` | greedy = быстрее |
| `STT_VAD_FILTER` | `true` | Silero-VAD, short-circuit тишины (E2) |
| `STT_TIMEOUT_SECONDS` | `5.0` | бюджет E3 |
| `STT_MAX_CONCURRENCY` | `2` | семафор параллельных STT |
| `STT_WARMUP_ON_STARTUP` | `false` | в проде `true` — прогрев весов до приёма трафика |
| `MAX_AUDIO_BYTES` | `1048576` | ~1 МБ |
| `MAX_AUDIO_SECONDS` | `15` | лимит длительности |
| `PRON_EXCELLENT_THRESHOLD` | `90` | порог excellent |
| `PRON_PASSED_THRESHOLD` | `75` | порог passed |

---

## 8. Структура файлов

### Backend (`backend/app/modules/speaking/`)
```
domain/
  value_objects.py   PronunciationStatus, TaskType, ScoreThresholds, MatchDetails, PronunciationScore
  entities.py        PronunciationAttempt
  services.py        ScoringService (WER) — чистый домен
  repositories.py    порты: SttEngine, AudioStore, PronunciationAttemptRepository
application/
  dtos.py            CheckPronunciationCommand
  use_cases.py       CheckPronunciationUseCase (оркестрация, нефатальный персист)
infrastructure/
  audio.py           decode_to_pcm (PyAV → 16kHz mono)
  faster_whisper_engine.py   FasterWhisperEngine + whisper_language() + segments_to_text()
  supabase_repositories.py   SupabasePronunciationAttemptRepository
  analytics.py       structlog-события
presentation/
  dependencies.py    DI (движок-синглтон, репозиторий, пороги)
  router.py          POST /api/v1/pronunciation/check
```
Прочее: [main.py](backend/app/main.py) (роутер + lifespan-прогрев), [migrations/002_pronunciation_attempts.sql](backend/migrations/002_pronunciation_attempts.sql).

### Frontend (`frontend/src/`)
```
lib/pronunciationService.ts       клиент API + PronunciationError
hooks/useAudioRecorder.ts         запись/разрешения/состояния (S1)
pages/speaking/
  PronunciationExercise.tsx       UI: запись→результат→retry (S4, S7, аналитика)
  copy.ts                         локализуемая копия (S7.3)
  Speaking.tsx                    страница-хост, роут /speaking
lib/analytics.ts                  + speaking-события (S6)
components/atoms/Button.tsx       + ariaLabel
```

---

## 9. Тестирование

### Backend (pytest) — 172 passed
- `tests/test_domain_speaking.py` — чистые юнит-тесты скоринга (пороги, нормализация, substitution/deletion/insertion, перестановка, E5, валидация).
- `tests/test_speaking_stt_helpers.py` — хелперы движка (маппинг языка, склейка сегментов) **без скачивания весов**.
- `tests/test_speaking_endpoint.py` — интеграция через `FakeSttEngine` (`dependency_overrides`): auth, статусы, E3 timeout→503, 400/413/422, E5, **персист (S5)**, нефатальность при сбое БД, **аналитика (S6)** через `capture_logs`.

Запуск:
```bash
cd backend && .venv/bin/pytest -q
.venv/bin/ruff check . && .venv/bin/mypy app
```

### Frontend (vitest) — 15 тестов модуля
- `lib/pronunciationService.test.ts` — multipart, токен, маппинг 503/413/400/network.
- `hooks/useAudioRecorder.test.ts` — запись→blob, denied (E1), reset, unsupported.
- `pages/speaking/PronunciationExercise.test.tsx` — показ цели + аналитика, mic denied + skip, полный flow→excellent, retry (AC #7), timeout (E3), E5.

Запуск:
```bash
cd frontend
npx vitest run src/lib/pronunciationService.test.ts src/hooks/useAudioRecorder.test.ts src/pages/speaking/PronunciationExercise.test.tsx
```

---

## 10. Покрытие acceptance-критериев

| AC | Где |
|---|---|
| 1. Запись голоса | `useAudioRecorder` |
| 2. Отправка аудио | `pronunciationService` |
| 3. Распознавание | `FasterWhisperEngine` |
| 4. Сравнение с эталоном | `ScoringService` |
| 5. Процент совпадения | `match_pct` |
| 6. Статус pass/fail | `status` |
| 7. Безлимитные повторы | retry-кнопка, `attempt_no` |
| 8. Без платных API | faster-whisper (OSS) |
| 9. Mic denied → guidance + skip | E1 в компоненте |
| 10. Нет речи → не зовём STT | Silero-VAD (E2) |
| 11. >5с → повторяемая ошибка | `asyncio.wait_for` → 503 (E3) |
| 12. Видны фраза/распознанное/%/статус | Result UI |
| 13. События аналитики | §6 |
| 14. Без интонации/акцента в v1 | вне scope |
| 15. Скоринг на сервере | домен + контракт |

---

## 11. Развёртывание

- **Dockerfile** ([backend/Dockerfile](backend/Dockerfile)): добавлен `libgomp1` (OpenMP для CTranslate2). Системный ffmpeg не нужен (PyAV bundled).
- **Прод:** установить `STT_WARMUP_ON_STARTUP=true`, чтобы веса грузились на старте (иначе первый запрос рискует выйти за 5 с). Рассмотреть предзагрузку весов в образ.
- **Память:** модель `base` ~1 ГБ RAM на воркер — учесть в лимитах контейнера.
- **БД:** применить миграцию `002_pronunciation_attempts.sql`.

---

## 12. Ограничения и открытые вопросы

- **Lesson-интеграция (S5.2)** — отложена: в репозитории нет системы уроков (exercise-block), упражнение доступно на отдельном роуте `/speaking` с примером.
- **Платформы:** реализован **web** (приложение web-only); нативные iOS/Android из стори — вне этого репозитория.
- **Открытые решения (PO)** реализованы дефолтами и помечены `[OPEN]` в коде: алгоритм match% (1−WER), пороги 90/75, лимиты 15с/~1МБ, размер модели `base`, удаление аудио, требование сети, mic-denied → skip. См. §8 стори.
- **Латентность на CPU:** для некоторых языков может потребоваться `small`/GPU или вынос STT в очередь (Celery/отдельный сервис) — v2.

### Предобоснованные пред-существующие проблемы фронт-CI (не относятся к модулю)
`App.test.tsx` падает (`IntersectionObserver` не определён в jsdom, файл `Landing.tsx`), присутствует артефакт `dist-app/`, есть tsc/eslint ошибки в `Game.tsx`/`SentenceGame.tsx`/контекстах. Это было до данной работы; рекомендуется отдельный заход на починку CI.
