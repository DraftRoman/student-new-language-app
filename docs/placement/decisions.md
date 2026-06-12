# Placement test — implementation decisions

PR-ready summary of how the open questions in [stories/test-level.md §3](../../stories/test-level.md) were resolved, plus a map from §9 acceptance criteria to code and tests.

---

## 1. Open-question resolutions (§3)

Each row matches the question id and headline from the story. "Locked in" means the default the story proposed; "code" points at the single isolated spot where a different decision becomes a one-line change.

| #  | Question | Decision | Where it lives |
|----|----------|----------|----------------|
| Q1 | Failing A1 — floor or different handling? | **A1 floor.** Recommendation is the last passed level; if no level was ever passed, return A1. | [PlacementLadder.recommend](../../backend/app/modules/placement/domain/services.py) |
| Q2 | Passing C2 — what's the ceiling? | **Cap at C2, +1 override disabled.** `allowed_max(C2) == C2`; UI hides the override radio when `allowedMax === recommended`. | [PlacementLadder.allowed_max](../../backend/app/modules/placement/domain/services.py), [ConfirmStep.tsx](../../frontend/src/pages/placement/steps/ConfirmStep.tsx) |
| Q3 | What counts as one error? | **One incorrectly answered item = 1 error.** Block = 20 vocab + 5 sentence = 25 items; fail at ≥ 4 errors. | [BLOCK_SIZE_TOTAL / BASE_FAIL_THRESHOLD](../../backend/app/modules/placement/domain/value_objects.py) |
| Q4 | Partial sentence credit? | **No partial credit.** Right words in wrong order = 1 error. | [Scorer.score_sentence](../../backend/app/modules/placement/domain/services.py) |
| Q5 | Content gap — fewer than 20 / 5 items? | **Proportional scaling.** `threshold = max(1, round(4 * total_items / 25))`. Empty block = auto-pass with a log. | [ContentGapPolicy](../../backend/app/modules/placement/domain/services.py) |
| Q6 | Translation direction & locale? | **Target ↔ user's interface language**, via the existing content/locale model. The frontend `VocabItem` exposes `question` / `answer` as-is — the platform's content store owns direction. | [placementService.ts](../../frontend/src/lib/placementService.ts) |
| Q7 | Tech stack? | **Followed the repo.** Python 3.12 + FastAPI for the backend (DDD layout, mirrored progress/catalog), React 19 + TS + Tailwind v4 for the frontend, JSON file-backed dev store (Supabase adapter is the next step — same `PlacementSessionRepository` / `ContentSource` protocols slot in unchanged). | [presentation/dependencies.py](../../backend/app/modules/placement/presentation/dependencies.py) |

---

## 2. Acceptance criteria mapping (§9)

| #  | Criterion | Code | Test |
|----|-----------|------|------|
| 1  | New user asked whether they have studied the language before. | [PriorExperienceStep.tsx](../../frontend/src/pages/placement/steps/PriorExperienceStep.tsx), [POST /api/onboarding/prior-experience](../../backend/app/modules/placement/presentation/router.py) | `TestPriorExperience` in [test_placement_endpoints.py](../../backend/tests/test_placement_endpoints.py) |
| 2  | No experience → A1, no test shown. | [AnswerPriorExperienceUseCase](../../backend/app/modules/placement/application/use_cases.py) early-return | `test_beginner_path_no_assigns_a1_and_starts_without_test` |
| 3  | Experienced users can take the test. | Same use case, "yes" branch creates / resumes session. | `test_yes_creates_session_and_returns_first_block` |
| 4  | 20 word-matching + 5 sentence-building tasks per level from existing content. | `BLOCK_VOCAB_COUNT = 20`, `BLOCK_SENTENCE_COUNT = 5`; sourced via `ContentSource` protocol — JSON dev impl, Supabase later. | `TestJsonContentSource` in [test_placement_json_repositories.py](../../backend/tests/test_placement_json_repositories.py) |
| 5  | < 4 errors → advance. | [PlacementLadder.recommend](../../backend/app/modules/placement/domain/services.py) + `ContentGapPolicy.passed` | `test_three_errors_passes`, ladder happy path |
| 6  | ≥ 4 errors → test ends. | Same; `is_complete` returns True on fail. | `test_exactly_four_errors_fails`, `test_fail_completes_test_and_recommends_last_passed` |
| 7  | System persists the determined level. | `ConfirmLevelUseCase` writes `confirmed_level`; JSON repo atomic write. | `test_accept_recommendation` |
| 8  | User can choose one level above. | `PlacementLadder.allowed_max` + `validate_choice`; UI radio in [ConfirmStep.tsx](../../frontend/src/pages/placement/steps/ConfirmStep.tsx). | `test_plus_one_override_allowed`, `test_plus_one_step_is_valid` |
| 9  | Cannot choose above the ceiling. | `validate_choice` raises `ValidationError`; presentation maps to 400. | `test_two_steps_above_rejected`, `test_two_steps_above_rejected` (algorithm) |
| 10 | Learning begins at confirmed level. | `Placement.tsx` navigates to `/dashboard` after `confirmLevel()`; the dashboard reads the user's level from the session record. | `test_full_happy_path_*` (covers confirm → 200 → persisted state) |
| 11 | PO additions — A1 floor, C2 cap, analytics fire. | Q1 / Q2 covered above; analytics: [lib/analytics.ts](../../frontend/src/lib/analytics.ts) emits all 7 §5.5 events, exercised by [Placement.test.tsx](../../frontend/src/pages/placement/Placement.test.tsx). | `test_floor_a1_fail_recommends_a1_q1`, `test_pass_through_c2_caps_at_c2_q2`, override event assertion in Placement.test.tsx |

---

## 3. Coverage of §5.5 analytics events

All seven events are emitted by [Placement.tsx](../../frontend/src/pages/placement/Placement.tsx) at the moments specified by the story. `setAnalyticsSink()` swaps the default `console.info` sink for a real SDK without touching call sites.

| Event | Emitted from |
|-------|--------------|
| `onboarding_prior_experience_answered` | `handleGate` (before the API call) |
| `placement_test_started` | `handleGate` "yes" branch, after session creation |
| `placement_level_completed` | `handleSentenceComplete`, on every level submit |
| `placement_test_completed` | `handleSentenceComplete`, when `next_level` is null |
| `placement_level_override_used` | `handleConfirm`, only if `chosen !== recommended` |
| `placement_level_confirmed` | `handleConfirm`, after the confirm API succeeds |
| `learning_started` | `handleGate` "no" branch (`via: "default_a1"`) **or** `handleConfirm` (`via: "placement"`) |

---

## 4. Out-of-scope by story §2 (deliberately not built)

- AI-generated questions — content read-only from existing platform sources.
- Speech / written assessment, listening exercises.
- Re-taking the test outside onboarding — `ConfirmLevelUseCase` rejects level changes after confirmation (§5.6).

---

## 5. Supabase wiring — apply this before going live

The session repository backend is selected by the `PLACEMENT_BACKEND` env var (`Settings.placement_backend` in [config.py](../../backend/app/config.py)):

| Value | Behavior | When to use |
|---|---|---|
| `auto` (default) | Supabase if `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` look real, JSON otherwise. | Normal operation. No env change required after the migration runs. |
| `json` | Force the file-backed dev store even when Supabase is configured. | **Kill-switch.** Use to keep the rest of the app on Supabase while placement keeps writing to disk — e.g. if the migration hasn't been applied yet, or to roll back placement quickly without restarting Supabase clients. |
| `supabase` | Force Supabase. Crashes loudly on the first request if credentials aren't real. | Production guard. Prevents silent JSON writes if env is misconfigured. |

The resolver is pure (`_resolve_backend(backend, configured) -> "json" | "supabase"`) and is covered by [`test_placement_backend_resolution.py`](../../backend/tests/test_placement_backend_resolution.py). The decision is made *once* per process at first resolution and cached — restart the backend after flipping the flag.

### Step 1 — apply the migration (one-time, manual)

Open Supabase Studio → SQL Editor and run [`backend/migrations/001_placement_tables.sql`](../../backend/migrations/001_placement_tables.sql). It is fully idempotent (`CREATE TABLE IF NOT EXISTS`, `DO $$ ... IF NOT EXISTS ... $$`) — re-running is safe. **Nothing is dropped or deleted.**

What it provisions:

- `public.placement_session` — aggregate root; one row per run.
- `public.placement_level_attempt` — one row per attempted CEFR level, with `UNIQUE(session_id, cefr_level)` enforcing the §5.1 idempotency invariant at the DB level.
- A partial unique index `placement_session_one_active_per_user` so a user can have **at most one** `in_progress` session, mirroring `get_active_for_user()` in the app.
- RLS enabled + owner-only SELECT policies. The backend uses the service-role key (which bypasses RLS) — policies are a defense-in-depth guard in case the anon key ever touches these tables client-side.

### Step 2 — verify connectivity

```bash
cd backend
env SUPABASE_URL="$(grep ^SUPABASE_URL= ../.env | cut -d= -f2-)" \
    SUPABASE_SERVICE_KEY="$(grep ^SUPABASE_SERVICE_KEY= ../.env | cut -d= -f2-)" \
    .venv/bin/python -c "from app.shared.infrastructure.supabase_client import supabase; \
                         print(supabase.table('placement_session').select('id').limit(1).execute().data)"
```

A successful call returns `[]` (table empty). A `PGRST205 Could not find the table` means step 1 has not been applied yet.

### Step 3 — gradual rollout (recommended)

The default `PLACEMENT_BACKEND=auto` will pick Supabase immediately on the next restart, because the credentials in `.env` are real. To roll out more carefully:

1. **Before applying the migration:** set `PLACEMENT_BACKEND=json` in `.env`. The backend continues using the file store; Supabase is untouched by placement.
2. **Apply the migration** via Studio (step 1 above).
3. **Verify connectivity** (step 2 above).
4. **Flip to Supabase:** remove `PLACEMENT_BACKEND` from `.env` (back to `auto`), or set `PLACEMENT_BACKEND=supabase` to be explicit. Restart the backend.
5. **Rollback if something breaks:** set `PLACEMENT_BACKEND=json` and restart. The JSON file at `backend/data/placement_sessions.json` is left in place between flips — it's the recovery state.

### What's deliberately *not* migrated to Supabase

- **Content source** — still JSON ([tests/fixtures/placement/content.json](../../backend/tests/fixtures/placement/content.json)). Story §4.3 says blocks come from "existing platform content", but mapping the existing `dictionary` / `sentences` tables onto `VocabItem` + `SentenceItem` requires (a) a CEFR level column on `dictionary` (today only `sentences` has `level`), (b) a `construction_type` column or some other tag, (c) a product call on translation direction (Q6). Until that mapping is settled, JSON content keeps the placement feature shippable. The protocol [`ContentSource`](../../backend/app/modules/placement/domain/repositories.py) is unchanged — swapping in a Supabase content source is one factory replacement.

---

## 6. Still pending (post-merge — depend on external work)

1. **Apply [`migrations/001_placement_tables.sql`](../../backend/migrations/001_placement_tables.sql) in Supabase Studio** — must happen before the first user flow. Step 1 above.
2. **`SupabaseContentSource`** — see "What's deliberately not migrated" above; needs schema additions, not just code.
3. **Real analytics SDK wiring** — replace the `console.info` default in [analytics.ts](../../frontend/src/lib/analytics.ts); event names and payload shapes are stable.
4. **i18n runtime** — `copy.ts` is the English string source; a future `react-i18next` pass adds language bundles without touching components.
5. **Pre-existing build noise** unrelated to placement (`AuthContext.tsx`, `Game.tsx`, `SentenceGame.tsx` strict-mode warnings) — separate cleanup task.
