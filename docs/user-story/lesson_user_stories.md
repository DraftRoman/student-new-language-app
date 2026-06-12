# User Stories: Lesson Experience

**Продукт:** Language Learning Platform (iOS · Android · Web)
**Epic:** Core Lesson Experience
**Roadmap theme:** Habit-forming daily learning loop
**Автор:** Lead Product Owner
**Статус:** Draft for refinement

---

## Контекст и связь с vision

Все истории ниже защищают шесть non-negotiable качеств продукта: *engaging, lightweight, habit-forming, beginner-friendly, visually clean, motivational*. Каждая декомпозирована по 360-view (happy path · edge cases · errors · iOS/Android/Web · accessibility · localization · analytics · migration) и содержит гипотезу с измеримой метрикой.

**Стандарт оценки готовности story:** AC независимо тестируемы, нет «zombie»-пунктов, есть привязка к outcome.

---

## Карта историй

| ID | Story | Тип | Use case |
|---|---|---|---|
| US-LSN-01 | Word-pair exercise block (10 слов с переводом) | Exercise block | UC1 |
| US-LSN-02 | Mixed-format lesson composition | Lesson structure | UC2 |
| US-LSN-03 | In-lesson progress indicator | UX surface | UC3 |
| US-LSN-04 | Beginner sentence-structure exercise | Exercise block | UC4 |
| US-LSN-05 | Cross-session progress & return hook | Retention surface | UC5 |

---

## US-LSN-01 — Word-pair exercise block (10 слов с переводом)

**Story.**
*As a learner, I want to practise a set of 10 words with their translations in a single block, so that I memorise them and grow my active vocabulary.*

**Why (big-picture).** Это базовая единица заучивания лексики и точка входа в spaced repetition. Без надёжного word-block невозможно собрать ни variety-урок (US-LSN-02), ни прогрессию уровней.

**Hypothesis.** Если показывать слово → перевод → запрос ответа в 4 форматах (tap-to-match, type-in, audio-recognition, reverse translation), то retention слова на 24h вырастет vs. одиночный формат.

**Primary metric.** 24h word recall rate (доля корректных ответов на это же слово через 24h) ≥ 60%.
**Guardrail.** Среднее время блока ≤ 90 сек; drop-off внутри блока ≤ 8%.

**Acceptance criteria.**
1. Блок состоит ровно из 10 word-pair упражнений за один проход.
2. Источник слов — приоритет SRS-очереди (due first), затем новые слова для текущего уровня.
3. Поддерживается ≥ 2 типа взаимодействия из {tap-to-match, type-in, listen-and-pick, choose-translation}; конкретный сет задаётся конфигом, не хардкодом.
4. Каждый ответ получает мгновенный feedback: ✓/✗ + правильный перевод, без модальных окон.
5. На неправильный ответ слово возвращается в конец очереди блока минимум один раз.
6. Кнопка «Не знаю / Skip» доступна; такой ответ помечается отдельно (не считается ни верным, ни ошибочным).
7. Каждое слово имеет TTS-аудио; кнопка проигрывания доступна на каждом экране.
8. Завершение блока триггерит обновление SRS-интервала по каждому слову.

**360-view.**

- *Happy path.* Учащийся проходит 10 слов, видит итоговый счёт корректных ответов.
- *Edge cases.* Меньше 10 due-слов в очереди → добиваем новыми. Список вообще пуст → блок не запускается, показываем CTA «Изучите новый набор».
- *Error states.* Нет сети → офлайн-режим если контент уже закэширован; если нет — graceful empty state с retry.
- *iOS.* Haptic light при правильном ответе, medium при ошибке. Респект Reduce Motion.
- *Android.* Material ripple, системный back = пауза урока с confirm-диалогом (не выход).
- *Web.* Поддержка клавиатуры: 1–4 для выбора, Enter — подтвердить, Space — повтор аудио.
- *Accessibility.* VoiceOver/TalkBack читает слово, перевод и состояние «правильно/неправильно». Контраст AA. Динамический шрифт до +200%.
- *Localization.* RTL для арабского/иврита; шрифты с поддержкой иероглифов/кириллицы/диакритики; TTS на изучаемом языке (не на UI-языке).
- *Analytics.* `word_block_started`, `word_attempted` (word_id, format, correct, latency_ms), `word_skipped`, `word_block_completed` (score, duration_ms).
- *Migration.* Существующие пользователи: SRS-история сохраняется, блок строится поверх их текущей очереди.

**Out of scope.** Speaking-формат (отдельный exercise type), генерация новых слов AI-моделью, family-аккаунты.

**Dependencies.** SRS-сервис, TTS-pipeline, word dictionary с переводами на N языков.

---

## US-LSN-02 — Mixed-format lesson composition

**Story.**
*As a learner, I want a lesson built from a variety of exercise blocks (word-pair, quiz, listening, speaking, sentence-structure, matching) so that I don't get bored and I can comfortably finish at least one lesson per day.*

**Why (big-picture).** Variety = engaging + lightweight + habit-forming одновременно. Это центральная история всего epic'а: именно композиция превращает набор блоков в «lesson», который пользователь готов проходить ежедневно.

**Hypothesis.** Mixed-format урок (≥ 3 разных типа блоков, ≤ 7 минут) увеличит D1 retention и daily lesson completion rate vs. single-format урок.

**Primary metric.** Daily lesson completion rate (≥ 1 урок/день среди активных) ≥ 45%; D1 retention ≥ 55%.
**Guardrail.** Средняя длительность урока 4–7 мин (95-й перцентиль ≤ 10 мин). Self-reported «boredom» в exit-survey < 10%.

**Acceptance criteria.**
1. Lesson содержит 4–6 блоков, минимум 3 разных типа.
2. Один из блоков — word-pair (US-LSN-01); порядок и набор остальных подбирается lesson generator'ом.
3. Speaking-блок включается только при наличии разрешения на микрофон; иначе заменяется другим типом без падения качества урока.
4. Lesson генерируется один раз при старте и кешируется до завершения (нельзя «перезапустить» для более лёгких блоков).
5. Доступна пауза с возможностью продолжить с того же места в течение 24 часов.
6. Завершение урока засчитывает «daily lesson» (вклад в streak — US-LSN-05).
7. После завершения — экран summary: что прошёл, сколько XP, что закрепится завтра.

**360-view.**

- *Happy path.* 5 блоков подряд, плавные переходы, summary, CTA «Ещё один?».
- *Edge cases.* Недостаточно контента для variety → деградация до 3 блоков с явным сообщением «You're ahead — short lesson today».
- *Error states.* Краш в середине → восстановление с того же блока при следующем входе в течение 24h.
- *iOS.* Прогресс-обновление в Live Activity (опционально, отдельный story).
- *Android.* Foreground service не нужен; уведомление о возобновлении урока через 4 часа простоя.
- *Web.* Полноэкранный режим опционален; tab visibility change = автопауза.
- *Accessibility.* Все типы блоков должны соответствовать a11y-стандартам индивидуально. Если speaking недоступен по a11y-причинам — автоматическая замена.
- *Localization.* Набор доступных типов может различаться по парам языков (например, speaking может быть отключён для пар с непокрытым ASR).
- *Analytics.* `lesson_started` (lesson_id, composition[]), `block_transition`, `lesson_completed` (duration, blocks_completed, blocks_total), `lesson_abandoned` (block_index, reason).
- *Migration.* Незавершённые «старые» уроки помечаются как завершённые с пометкой migration, не ломая streak.

**Out of scope.** AI-генерация полностью персонализированных уроков (отдельный epic «Personalisation v2»). Групповые/соревновательные уроки.

**Dependencies.** US-LSN-01, exercise-types catalog, lesson generator service, streak service.

---

## US-LSN-03 — In-lesson progress indicator

**Story.**
*As a learner, I want to see my progress within the current lesson so that I know how much is left and stay motivated to finish.*

**Why (big-picture).** Visible progress снижает abandonment в середине урока и закрывает «motivational» non-negotiable на микроуровне. Дёшево по стоимости, высокий impact — типичный кандидат на высокий RICE-скор.

**Hypothesis.** Видимый, заполняющийся прогресс-бар сверху урока снизит mid-lesson abandonment на ≥ 5 п.п.

**Primary metric.** Mid-lesson abandonment rate (выход между блоком 2 и предпоследним) снижение на ≥ 5 п.п. в A/B-тесте.
**Guardrail.** Без увеличения rage-quit (быстрый выход после ошибки) и без роста времени на блок.

**Acceptance criteria.**
1. В верхней части экрана урока — горизонтальный прогресс-бар, отражающий долю пройденных блоков (не отдельных упражнений).
2. Бар анимируется при переходе между блоками (≤ 400 мс, респект Reduce Motion).
3. Бар содержит контрастный, lightweight визуал — без цифр и счётчиков, по умолчанию (минималистичный hierarchy).
4. При нажатии — раскрывается tooltip/sheet: «Block X of Y», без раскрытия будущего контента (не спойлерим формат).
5. Прогресс не откатывается при ошибке внутри блока; ошибки влияют только на счёт, не на прогресс.
6. По завершении урока бар заполнен на 100% и сменяется success-анимацией (короткой, ≤ 1с).

**360-view.**

- *Happy path.* Бар плавно растёт, пользователь видит близость финиша на блоке 4 из 5.
- *Edge cases.* Пауза/возобновление — состояние бара сохраняется. Жёсткие правки конфига урока в полёте — бар нормализуется.
- *Error states.* Состояние бара рассинхронизировано с блоком → fallback к корректному значению из state, без визуальных скачков.
- *iOS.* Соблюдает safe area под Dynamic Island.
- *Android.* Не перекрывается system status bar; в edge-to-edge режиме корректные отступы.
- *Web.* Sticky сверху; не уезжает при скролле длинного блока.
- *Accessibility.* `role="progressbar"`, `aria-valuenow/min/max`, voiceover-чтение «Block X of Y, Z percent complete» при фокусе.
- *Localization.* RTL — прогресс заполняется справа налево.
- *Analytics.* `progress_tooltip_opened`, `lesson_progress_observed` (block_index, total_blocks) — для проверки гипотезы.
- *Migration.* Не требуется (новая UI-поверхность).

**Out of scope.** XP/streak/уровень — это US-LSN-05 (cross-session). Здесь только in-lesson.

**Dependencies.** US-LSN-02 (структура урока известна заранее).

---

## US-LSN-04 — Beginner sentence-structure exercise block

**Story.**
*As a beginner, I want to learn basic sentence structures so that I can progress from words to phrases and unlock the next level.*

**Why (big-picture).** Закрывает beginner-friendly non-negotiable и привязывает обучение к ощутимой *прогрессии*: «слова → фразы → уровень up». Это критическая ступень для CR из onboarding в активного пользователя.

**Hypothesis.** Если давать beginner'ам sentence-structure блок с drag-to-build-механикой (а не free typing), доля пользователей, прошедших уровень 1 за 7 дней, вырастет vs. контроль без этого блока.

**Primary metric.** Level-1 completion rate за 7 дней ≥ 35%.
**Guardrail.** Ошибочность в блоке среди beginner'ов ≤ 40% (иначе блок воспринимается как наказывающий, противоречит beginner-friendly).

**Acceptance criteria.**
1. Блок предъявляет 5–8 предложений возрастающей сложности (subject + verb → subject + verb + object → отрицание → вопрос).
2. Основная механика — drag-to-arrange: слова уже даны, нужно собрать в правильном порядке.
3. Отвлекающие слова (distractors) присутствуют, но в beginner-режиме их ≤ 1 на предложение.
4. Каждое предложение сопровождается переводом и опциональным аудио.
5. На правильный ответ — короткое объяснение паттерна одной фразой («Subject comes before verb»), не лекция.
6. На ошибку — мягкая подсказка с подсветкой первого правильного слова; без штрафа за повторную попытку.
7. Блок засчитывается в прогресс уровня только при ≥ 70% правильных ответов; иначе предлагается повторить позже без блокировки следующих уроков.

**360-view.**

- *Happy path.* Beginner проходит 6 предложений, видит «1 grammar pattern learned: word order».
- *Edge cases.* Языки с относительно свободным порядком слов (например, русский для англоязычного учащегося) — принимаются альтернативные корректные порядки; список валидных вариантов хранится в контенте.
- *Error states.* Контент-баг (нет валидного решения) → блок пропускается без падения, ошибка в логах для контент-команды.
- *iOS.* Drag-and-drop с native haptics на снап-в-слот.
- *Android.* Drag через long-press, корректные accessibility-actions.
- *Web.* Drag мышкой + альтернатива «клик по слову → клик по слоту» (для тач-устройств без drag и для a11y).
- *Accessibility.* Полностью проходимо клавиатурой и screen reader'ом: word picker → slot picker. `aria-grabbed`, `aria-dropeffect`.
- *Localization.* RTL: визуальный порядок слотов инвертируется; алгоритм валидации работает на логическом порядке.
- *Analytics.* `sentence_block_started` (level, pattern_id), `sentence_attempt` (correct, hints_used), `pattern_introduced` (pattern_id), `block_passed` / `block_retry_required`.
- *Migration.* Существующие beginner'ы получают блок при следующем уроке уровня 1; не пересоздаём старые уроки задним числом.

**Out of scope.** Свободный ввод предложений (free typing), грамматический разбор глубже word order, advanced-уровни.

**Dependencies.** Content pipeline для sentence patterns с переводами; level progression service.

---

## US-LSN-05 — Cross-session progress & return hook

**Story.**
*As a learner, I want to see my long-term progress (streak, mastered words, level, milestones) so that I'm motivated to come back and keep using the app.*

**Why (big-picture).** Это сердцевина retention-механики и habit-forming non-negotiable. Без видимого «куда я двигаюсь» дневная привычка не закрепляется и weekly retention деградирует. История связана с push-стратегией и paywall-flow, но не подменяет их.

**Hypothesis.** Visible streak + mastered-words counter + next-milestone on home screen увеличат D7 retention.

**Primary metric.** D7 retention ≥ 25% (бенчмарк-зависимый), D30 ≥ 12%.
**Guardrail.** Доля «streak-anxious» пользователей (репорт в survey или резкий уход после поломки streak) < 5%; streak-freeze включён по умолчанию для beginner'ов.

**Acceptance criteria.**
1. На главном экране после онбординга всегда видны три элемента: current streak (дни), words mastered (число), next milestone (с прогрессом до него).
2. Streak растёт на +1 при ≥ 1 завершённом уроке (US-LSN-02) в локальный день пользователя.
3. Streak имеет «freeze» — автоматическое сохранение при пропуске 1 дня, ≤ 2 раз в месяц; виден отдельной иконкой.
4. Milestones определены минимум 5 шкалами: 3, 7, 14, 30, 100 дней; каждая разблокирует визуальную награду (badge), без денежных бонусов.
5. Mastered words = слова, прошедшие порог SRS-интервала ≥ 7 дней.
6. При достижении milestone — single-screen celebration (≤ 2 с), без блокирующих модалок, с share-опцией (опционально).
7. История прогресса доступна на отдельном экране: график streak'ов и mastered words за последние 30/90 дней.
8. Push-уведомление о риске потерять streak уходит только если пользователь дал разрешение и не отключил эту категорию отдельно.

**360-view.**

- *Happy path.* День 1 — streak 1, день 2 — streak 2, на 3-й день milestone-награда, на 7-й — следующая.
- *Edge cases.* Перелёт через часовой пояс — используется локальное время устройства; ручная смена даты вперёд/назад не даёт читерить (используется server-side check на серьёзных milestones).
- *Error states.* Сеть упала после завершения урока — урок засчитывается локально, синхронизируется при восстановлении; конфликт разрешается в пользу пользователя.
- *iOS.* Live Activity / widget для streak (отдельная story, не блокер). Уведомления через UNUserNotificationCenter; категория «streak reminders».
- *Android.* Notification channel «streak reminders», возможен home-widget.
- *Web.* Email-канал вместо push (если включено); не показываем destructive language про потерю streak'а в маркетинге.
- *Accessibility.* Все числовые элементы озвучиваются screen reader'ом с единицами («7 day streak, 42 words mastered»). Не полагаемся только на цвет для статуса streak (горит/потерян).
- *Localization.* Pluralization для streak («1 день / 2 дня / 5 дней»). Milestone-копирайтинг проходит локализационный ревью — без культурно-чувствительных образов.
- *Analytics.* `streak_incremented`, `streak_lost`, `streak_frozen`, `milestone_reached` (milestone_id), `home_progress_viewed`, `push_streak_reminder_sent/opened`.
- *Migration.* Существующие пользователи получают streak, рассчитанный по истории lesson completions; mastered words пересчитываются один раз при первой сессии после релиза.

**Out of scope.** Leaderboards и социальные сравнения (отдельный epic). Платная «защита» streak (monetisation). Family-shared progress.

**Dependencies.** US-LSN-02 (источник «daily lesson completed»), SRS-сервис (mastered words), notifications service.

---

## Связи между историями

```
US-LSN-01 (word block) ──┐
                          ├──► US-LSN-02 (mixed lesson) ──► US-LSN-03 (in-lesson progress)
US-LSN-04 (sentence block)┘                                    │
                                                               ▼
                                                       US-LSN-05 (cross-session progress)
```

US-LSN-02 — fundament всего epic'а; US-LSN-01 и US-LSN-04 — два exercise-блока, которые в неё входят; US-LSN-03 — UI поверх неё; US-LSN-05 — retention-слой, который кормится сигналом «lesson completed» из US-LSN-02.

---

## Открытые вопросы для refinement

1. **Lesson generator** — детерминированный конфиг или ML-композиция? До решения — детерминированный.
2. **Speaking-блок** — какой ASR-провайдер и какое покрытие языков? Влияет на degradation-логику US-LSN-02.
3. **Streak freeze** — ограничение «≤ 2 раз в месяц» подтвердить CustDev'ом; возможно, нужен другой лимит для beginner vs. advanced.
4. **Sentence-pattern catalog (US-LSN-04)** — кто владеет: контент-команда или внешние лингвисты? Зависит SLA на расширение.
5. **Push-permission** — где и когда запрашиваем? Не в первом уроке (давит на lightweight).

---

## Что эти истории НЕ покрывают (анти-scope для ясности)

- Onboarding и выбор языка (отдельный epic).
- Paywall и подписка.
- Leaderboards и social.
- Offline-mode как полноценная фича (только базовое кеширование контента текущего урока).
- AI-генерация контента.
- Push-стратегия целиком (только streak-reminder упомянут).
