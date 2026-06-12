# Placement test — session handoff

Handoff for the next Claude session. Read top-to-bottom; everything is current as of the last green test run.

---

## TL;DR

The placement-test feature (story [stories/test-level.md](../../stories/test-level.md)) is **code-complete and tested**. The only remaining step is **one human action**: apply [backend/migrations/001_placement_tables.sql](../../backend/migrations/001_placement_tables.sql) in Supabase Studio. Until then, the backend automatically falls back to a JSON file store (`PLACEMENT_BACKEND=auto` → JSON because the tables 404).

---

## Status snapshot (last green run)

| Layer | Command (run from the layer's dir) | Result |
|---|---|---|
| Backend pytest | `.venv/bin/pytest -q` | **118 passed** |
| Backend ruff | `.venv/bin/ruff check .` | All checks passed |
| Backend mypy | `.venv/bin/mypy app` | 59 source files, no issues |
| Frontend vitest (placement) | `npm test -- --run src/pages/placement/Placement.test.tsx` | **5 passed** |
| Frontend eslint (placement files) | `npx eslint src/pages/placement/ src/lib/placementService.ts src/lib/analytics.ts` | Clean |
| Supabase connectivity | `dictionary.select(...).limit(1)` against real Supabase | OK |
| Supabase placement tables | `placement_session.select(...)` | **PGRST205 — not yet migrated** |

If anything above is red on the next session's first run, that's the regression to fix before adding code.

---

## What's done (in order)

| Step | Where | Notes |
|---|---|---|
| 1. Pure algorithm | [backend/app/modules/placement/domain/](../../backend/app/modules/placement/domain/) | `Scorer`, `ContentGapPolicy`, `PlacementLadder`. No I/O. |
| 2. JSON repos | [backend/app/modules/placement/infrastructure/json_*.py](../../backend/app/modules/placement/infrastructure/) | Atomic file writes via temp + replace. |
| 3. Application + presentation | [application/use_cases.py](../../backend/app/modules/placement/application/use_cases.py), [presentation/router.py](../../backend/app/modules/placement/presentation/router.py) | Five endpoints from story §6. Server-authoritative scoring + idempotency. |
| 4. Frontend service + UI | [frontend/src/pages/placement/](../../frontend/src/pages/placement/) | Orchestrator + 4 step components. Click-to-place sentence builder (§5.3 a11y). |
| 5. Analytics + i18n stubs | [frontend/src/lib/analytics.ts](../../frontend/src/lib/analytics.ts), [frontend/src/pages/placement/copy.ts](../../frontend/src/pages/placement/copy.ts) | All 7 §5.5 events emit; copy externalized. |
| 6. Content-gap warning | [SubmitLevelAnswersUseCase](../../backend/app/modules/placement/application/use_cases.py) | `logger.warning` when `total_items < 25` (§5.1 / Q5). |
| 7. Resume on refresh | [placementStorage.ts](../../frontend/src/pages/placement/placementStorage.ts) + lazy-init in [Placement.tsx](../../frontend/src/pages/placement/Placement.tsx) | `{sessionId, level}` in localStorage; mid-block answers deliberately not persisted. |
| 8. Supabase session adapter | [supabase_session_repository.py](../../backend/app/modules/placement/infrastructure/supabase_session_repository.py) | SELECT / INSERT / UPDATE only — **zero DELETEs** (project constraint). |
| 9. SQL migration | [backend/migrations/001_placement_tables.sql](../../backend/migrations/001_placement_tables.sql) | Idempotent. Not applied yet. |
| 10. Backend flag | `PLACEMENT_BACKEND=auto\|json\|supabase` in [.env](../../.env) | Resolver `_resolve_backend` covered by [test_placement_backend_resolution.py](../../backend/tests/test_placement_backend_resolution.py). |
| 11. Decisions doc | [docs/placement/decisions.md](decisions.md) | Q1–Q7 resolutions + acceptance-criteria mapping + rollout steps. |

---

## What's pending — exactly one action required

**Apply the SQL migration.** The user has Supabase credentials in [.env](../../.env) and wants the placement session storage to use Supabase. The backend will switch automatically the next time it starts after the tables exist.

### How

1. Open Supabase Studio SQL Editor: https://supabase.com/dashboard/project/qmqxruztxfzeygftxlaw/sql/new
2. Paste [backend/migrations/001_placement_tables.sql](../../backend/migrations/001_placement_tables.sql) (or the copy already shown to the user in the prior turn).
3. Click **Run**.

**Constraint to honor:** the user said `тебе запрещено выполнять операции delete` — no DROP / DELETE / TRUNCATE operations under any circumstance. The migration is pure CREATE IF NOT EXISTS — safe to re-run.

### How to verify after the user reports done

Run the smoke test exactly as the prior turn did:

```bash
cd backend
env -i HOME="$HOME" PATH="$PATH" \
    SUPABASE_URL="$(grep ^SUPABASE_URL= ../.env | cut -d= -f2-)" \
    SUPABASE_SERVICE_KEY="$(grep ^SUPABASE_SERVICE_KEY= ../.env | cut -d= -f2-)" \
    .venv/bin/python -c "
from app.shared.infrastructure.supabase_client import supabase
for table in ['placement_session', 'placement_level_attempt']:
    try:
        res = supabase.table(table).select('*').limit(1).execute()
        print(f'OK  {table}  rows={len(res.data or [])}')
    except Exception as e:
        code = getattr(e, 'code', 'n/a')
        msg = getattr(e, 'message', str(e))[:120]
        print(f'ERR {table}  code={code}  {msg}')
"
```

**Expected after migration:** both tables print `OK  ... rows=0`.
**If still PGRST205:** the migration didn't take — re-check Studio output, ask the user to re-paste.

### After the smoke test passes

1. Confirm `PLACEMENT_BACKEND` in [.env](../../.env) — currently absent, which means `auto`. Leave it as is, or set `PLACEMENT_BACKEND=supabase` explicitly per [decisions.md §5 step 4](decisions.md). Restart the backend if it's running.
2. Optional: ask the user if they want to attempt a manual end-to-end flow (register → placement → confirm) via the dev servers. CLAUDE.md asks for this on UI changes, but it depends on the user having time and being OK opening a browser.

---

## Important constraints and conventions for the next session

- **No DELETEs.** User-enforced. Applies to DB rows, table drops, file deletes that lose state. The migration is pure CREATE; the Supabase repo is INSERT/UPDATE/SELECT only; existing JSON sessions file stays between flag flips as a recovery state.
- **No Supabase content source yet.** The story says blocks come from "existing platform content", but the existing `dictionary`/`sentences` tables don't have CEFR levels A1–C2 or construction-type tagging. Until a product call is made, vocab + sentence content reads from [tests/fixtures/placement/content.json](../../backend/tests/fixtures/placement/content.json). This is intentional — see [decisions.md "What's deliberately not migrated to Supabase"](decisions.md).
- **DDD layout.** Mirror the [progress / catalog modules](../../backend/app/modules/). domain → application → infrastructure → presentation. New features in another bounded context, not bolted onto placement.
- **Tests via `app.dependency_overrides`.** Never monkey-patch Supabase. The fake `FakePlacementSessionRepo` + `FakeContentSource` in [conftest.py](../../backend/tests/conftest.py) is how endpoint tests run without network.
- **Frontend analytics shape is frozen.** Event names + payload schemas in [analytics.ts](../../frontend/src/lib/analytics.ts) are what the product team will query — don't rename without coordination.
- **Frontend strings via `COPY` only.** [copy.ts](../../frontend/src/pages/placement/copy.ts) is the i18n seam — no hardcoded English in components.
- **Pre-existing build errors are not in scope.** `AuthContext.tsx`, `Game.tsx`, `SentenceGame.tsx` have strict-mode TS errors unrelated to placement. The user has not asked to fix them. `npm run build` will keep failing on those until a separate cleanup task.

---

## Files most likely to need edits next

| If the task is… | Touch this first |
|---|---|
| Schema change to `placement_session` | New migration `002_*.sql` (additive only), then update [SupabasePlacementSessionRepository](../../backend/app/modules/placement/infrastructure/supabase_session_repository.py) + [entities.py](../../backend/app/modules/placement/domain/entities.py). |
| Surface user's level on the dashboard | Backend: add `GET /api/me/level` (new identity-context route reading the latest confirmed session). Frontend: [Dashboard.tsx](../../frontend/src/pages/Dashboard.tsx). |
| Real analytics SDK | Replace the `console.info` default sink in [analytics.ts](../../frontend/src/lib/analytics.ts) — `setAnalyticsSink(...)` is already the seam. |
| i18n runtime | Add `react-i18next` and convert [copy.ts](../../frontend/src/pages/placement/copy.ts) into an `en.json` namespace. Components don't change. |
| Supabase content source | Needs product call first (Q6 + CEFR column on `dictionary`). Don't start without it. |

---

## Open questions to confirm with the user if you continue placement work

1. After confirmation, the dashboard doesn't yet read the user's confirmed level — courses still start at the implicit default. Is "use the confirmed level in lesson selection" the next story?
2. Existing dictionary/sentences tables — does product want CEFR-level + construction-type columns added so we can replace [content.json](../../backend/tests/fixtures/placement/content.json) with a Supabase content source?
3. Is a "retake placement" flow desired? Currently §5.6 forbids it; future product call.
