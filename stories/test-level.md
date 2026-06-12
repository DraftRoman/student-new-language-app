# Claude Code Task — Onboarding Placement Test (Language Level Determination)

**Source story:** *Определение стартового уровня языка для новых пользователей*
**Owning role:** Lead / Principal Product Owner — Language Learning Platform (iOS · Android · Web)
**Task type:** Feature implementation (full-stack)
**Authored as:** PO implementation brief for an autonomous coding agent. Read sections 0–3 before writing any code.

---

## 0. Context — read before coding

We are building a mobile-first language learning product (Duolingo-category). New users currently start every course at A1, which is a poor experience for anyone who already speaks the language and is a measurable drag on early engagement.

This feature adds an **optional onboarding placement test** that lets returning/experienced learners land on relevant content immediately, while keeping the zero-prerequisite path for absolute beginners.

**Product-feel non-negotiables this feature must defend** (every UI and flow decision is judged against these):

- **Lightweight** — short, low-cognitive-load test; never more than 5 vocabulary items on screen at once; fast to launch and exit.
- **Beginner-friendly** — a true beginner answers one question ("studied before?") and is done; they never see the test.
- **Motivational** — framing is encouraging ("Let's find your level"), never an exam; progress is visible per level.
- **Visually clean** — minimal chrome, one task type on screen at a time.
- **Habit-forming / Engaging** — the test ends *with the learner placed and started*, not at a dead-end screen.

**Hypothesis (for instrumentation, section 5.5):** Placing experienced users at their actual level increases Day-7 retention and lesson-1 completion versus the all-A1 baseline. The feature is not "done" until the events that prove or disprove this are shipped.

---

## 1. Definition of Done (one paragraph)

A new user, immediately after registration, is asked whether they have studied the target language before. A "no" assigns A1 and routes straight to learning. A "yes" runs a CEFR-laddered placement test (A1→C2) that climbs while the user makes fewer than 4 errors per level and stops on the first level with 4+ errors; the user is recommended the last passed level, may optionally bump one step higher (capped at the allowed ceiling), confirms, and begins learning at the confirmed level. All scoring is server-authoritative, all rules below are covered by automated tests, and the analytics events in 5.5 fire.

---

## 2. Scope

**In scope**
- Onboarding "prior experience" question + branching.
- Placement test engine: per-level blocks, scoring, ladder progression, recommendation.
- Level confirmation screen with optional "+1 step" override.
- Persisting the confirmed level and starting the course there.
- Server-side scoring and validation.
- Analytics events.
- Tests (unit + integration), with the level-determination algorithm covered exhaustively.

**Out of scope (explicit — do NOT build these)**
- AI-generated questions. Questions are drawn **only** from the platform's existing vocabulary and grammar content.
- Written/free-text speech assessment.
- Listening exercises.
- Re-taking the test outside onboarding (test is one-time, onboarding-only).

---

## 3. Assumptions & open questions — confirm with PO before locking these

These are decisions the story did not specify. I have proposed a default for each so you are **not blocked**; build to the default but isolate the logic so a different decision is a config/one-line change, and flag the choice in your PR description.

| # | Open question | Proposed default | Why it needs a human call |
|---|---|---|---|
| Q1 | What happens if the user **fails A1** (no "last passed level" exists)? | Assign **A1** (floor — never below A1). | Story example only covers mid-ladder failure; this is the most likely missed edge case. |
| Q2 | What if the user **passes C2** (top of ladder, no next level)? | End test, assign **C2**; "+1 step" override is disabled (ceiling). | Ladder has no level above C2. |
| Q3 | What counts as **one error**? | One incorrectly answered item = 1 error. 25 items/level (20 vocab + 5 sentence); threshold is 4+ errors → fail. | "Errors" is undefined in the story; the 4-error threshold is meaningless without a unit. |
| Q4 | Is a partially-correct sentence (right words, wrong order) an error? | Yes — full match required, otherwise 1 error. No partial credit. | Affects scoring and test outcomes. |
| Q5 | If existing content for a level lacks 20 words / 5 sentences, what then? | Use all available, scale the fail threshold proportionally, and log a content-gap warning; do not crash. | We pull from existing content only (no AI generation); content coverage is not guaranteed. |
| Q6 | Translation direction & UI locale for vocab matching? | Match target-language word ↔ the user's interface/native language translation, driven by existing locale data. | Localization correctness depends on platform's content model. |
| Q7 | Tech stack / repo conventions? | **Inspect the existing repository first** and follow its conventions (see section 6). Reference stack below is a fallback only. | The brief must not impose a stack the repo doesn't use. |

---

## 4. Functional requirements

### 4.1 Prior-experience gate
- After registration completes, present a single question: *have you studied this language before?* (encouraging tone, two clear choices).
- **No** → assign A1, persist, route to learning. No test shown.
- **Yes** → create a placement session and start the test at A1.

### 4.2 Level-progression algorithm (server-authoritative)

```
levels = [A1, A2, B1, B2, C1, C2]
recommended = null            # last passed level
for level in levels:
    block   = build_block(level)        # see 4.3, sourced from existing content
    errors  = score(block, user_answers(level))   # see 4.4
    if errors < FAIL_THRESHOLD:         # FAIL_THRESHOLD = 4
        passed = true
        recommended = level
        continue                        # climb to next level
    else:
        passed = false
        break                           # stop on first failed level

# Edge resolutions (sections Q1/Q2):
if recommended == null:                 # failed A1 -> floor
    recommended = A1
# if recommended == C2, ladder is exhausted; override ceiling applies (4.5)
```

- Climb continues only while `errors < 4`. Exactly `4` errors fails the level.
- The test ends on the **first** failed level; later levels are never attempted.

### 4.3 Per-level block structure
Each CEFR block (A1–C2) is built **from existing platform content** for that level:

- **Vocabulary matching — 20 items.** Match each word to its correct translation. **Client shows at most 5 words at a time** (lightweight non-negotiable); the remaining items are paged in.
- **Sentence building — 5 items.** Built from that level's words, using one of the learned constructions: **affirmative / interrogative / negative**. User orders the provided elements into the correct sentence. Full correct order required (Q4).

### 4.4 Scoring & assignment rules
- Error = any incorrectly answered item (Q3). Block total = 25 items.
- `errors < 4` → level **passed**; `errors >= 4` → level **failed**.
- Assigned level = last passed level; floor A1 if A1 itself failed (Q1).
- Scoring runs **on the server**. The client submits answers, not scores. Never trust a client-supplied level or error count.

### 4.5 Confirmation & optional "+1 step" override
- After the test, show the **recommended level** with motivational framing.
- User may accept it, or choose **one level above** the recommendation.
- Hard limit: user **cannot** choose any level above `recommended + 1`. If recommended is C2, no higher option exists (Q2) — override disabled.
- On confirm → persist the confirmed level.

### 4.6 Start learning
- The course begins at the **confirmed** level (which may differ from the recommended one by the +1 override).

---

## 5. 360-view requirements

### 5.1 Edge cases & error states
- Fail A1 → A1 (Q1). Pass C2 → C2, override disabled (Q2).
- Network drop mid-test: session is resumable; never silently restart and lose progress. Server holds session state.
- Double submission / replay of a level's answers: idempotent; server scores a level once.
- Content gap for a level (Q5): degrade gracefully, log, do not crash.
- User abandons onboarding: session left `in_progress`; resuming returns to the current level, not A1.

### 5.2 Platform parity (iOS · Android · Web)
- The **test logic, scoring, ladder rules, and API contract are the single source of truth** and identical across platforms. Platform clients render and submit; they do not re-implement scoring.
- The "max 5 words on screen" rule holds on every platform (it's a cognitive-load rule, not a screen-size accident).

### 5.3 Accessibility
- All interactive matching/ordering elements are keyboard- and screen-reader-operable; drag interactions have a non-drag fallback. Color is never the only signal for correct/incorrect.

### 5.4 Localization
- All copy is externalized for translation (no hardcoded strings). Vocabulary translation direction follows Q6 and the existing content/locale model.

### 5.5 Analytics events (ship with the feature — proves/disproves the hypothesis)
Emit, at minimum:
- `onboarding_prior_experience_answered` — `{ studied_before: bool }`
- `placement_test_started` — `{ session_id }`
- `placement_level_completed` — `{ session_id, level, errors, passed }`
- `placement_test_completed` — `{ session_id, recommended_level }`
- `placement_level_override_used` — `{ session_id, recommended_level, chosen_level }`
- `placement_level_confirmed` — `{ session_id, confirmed_level }`
- `learning_started` — `{ confirmed_level, via: "placement" | "default_a1" }`

These must let analytics later segment Day-7 retention and lesson-1 completion by entry level vs. the all-A1 baseline.

### 5.6 Data & user state
- Test is one-time, onboarding-only (constraint). After confirmation, the entry path is closed for that user.
- No migration of existing users in scope (new users only), but do not assume the user has zero prior course state — fail safe if called for a user who already has a level.

---

## 6. Data model & API contract

> First inspect the repo (section 7, step 0) and align naming/storage to existing conventions. The shapes below are the contract; adapt syntax to the stack in use.

**Entities (conceptual)**
- `PlacementSession` — `id, user_id, status (in_progress|completed), recommended_level, confirmed_level, started_at, completed_at`
- `PlacementLevelAttempt` — `session_id, cefr_level, vocab_errors, sentence_errors, total_errors, passed`
- Reuse existing content stores for words (`word, translation, cefr_level`) and sentence templates (`level, construction_type, elements, correct_order`). **Do not create new question content** — read from what exists.

**Endpoints (server-authoritative scoring)**
- `POST /onboarding/prior-experience` → `{ studied_before }`. If false: assign A1, return `{ level: "A1", test_required: false }`. If true: create session, return first level block.
- `GET /placement/{session_id}/level/{level}/block` → returns the level's 20 vocab pairs + 5 sentence tasks (client paginates vocab to 5 on screen).
- `POST /placement/{session_id}/level/{level}/answers` → `{ answers }`; server scores, returns `{ errors, passed, next_level | null, recommended_level | null }`.
- `GET /placement/{session_id}/result` → `{ recommended_level, allowed_max_level }`.
- `POST /placement/{session_id}/confirm` → `{ chosen_level }`; validate `chosen_level <= allowed_max_level`, persist, return `{ confirmed_level }`. Reject out-of-range with a clear error.

**Reference stack (fallback only, per Q7):** Web client Next.js/React, backend Python/FastAPI; otherwise match the repo.

---

## 7. Suggested implementation plan (execute in order)

0. **Discover.** Read the repo: language, framework, test runner, existing onboarding flow, existing word/grammar content models, analytics SDK, i18n setup. Summarize findings and your stack decision before coding.
1. Implement the level-determination **algorithm as a pure, isolated module** with no I/O. (Highest-risk logic — build and test this first.)
2. Add data models / migrations for `PlacementSession` and `PlacementLevelAttempt`.
3. Build the API endpoints (section 6) with server-side scoring.
4. Wire the prior-experience gate into the existing onboarding flow.
5. Build the test UI (vocab matching with ≤5 on screen; sentence ordering) and the confirmation screen with the +1 override.
6. Add analytics events (5.5) and i18n externalization.
7. Tests (section 8). 8. PR with open-question decisions (section 3) called out.

---

## 8. Testing requirements

The level-determination algorithm reliability is a **critical user journey** — treat its test coverage as defect-elimination, not a formality. Required cases:

- **Boundary:** 3 errors → pass; **exactly 4** errors → fail (off-by-one guard).
- **Ladder:** A1 pass, A2 pass, B1 fail → recommends **A2** (story's worked example).
- **Floor (Q1):** A1 fail → recommends **A1**.
- **Ceiling (Q2):** all levels pass through C2 → recommends **C2**, override disabled.
- **Override validation:** recommended A2 → B1 allowed; C1 rejected.
- **Content gap (Q5):** level with <20 words / <5 sentences degrades gracefully.
- **Server authority:** client-submitted level/score is ignored.
- **Integration:** full happy path (yes → ladder → recommend → +1 → confirm → start) and the beginner path (no → A1 → start) end-to-end.

---

## 9. Acceptance criteria (testable, mapped from the story)

1. New user is asked whether they have studied the language before. ✅
2. Users without experience start automatically at A1. ✅
3. Users with experience can take the placement test. ✅
4. Each level presents 20 word-matching tasks and 5 sentence-building tasks, sourced from existing content. ✅
5. Fewer than 4 errors → advance to the next level. ✅
6. 4 or more errors → test ends. ✅
7. The system persists the determined level. ✅
8. User can choose one level above the recommendation. ✅
9. User cannot choose a level above the allowed ceiling. ✅
10. Learning begins at the user-confirmed level. ✅
11. *(Added by PO — 360-view):* failing A1 floors to A1 (Q1), passing C2 caps at C2 (Q2), and the analytics events in 5.5 fire. ✅

---

## 10. Deliverables & conventions
- Follow the existing repo's style, structure, and test conventions (do not introduce a new framework without flagging it).
- No new question-generation logic; read existing content only.
- All user-facing strings localized; no hardcoded copy.
- PR description must list how each open question in section 3 was resolved.