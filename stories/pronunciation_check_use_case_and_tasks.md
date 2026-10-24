# Use Case & Implementation Breakdown — Pronunciation Check via Voice Recording

**Feature area:** Speaking / Pronunciation (Language Learning Platform · iOS · Android · Web)
**Source artifact:** User Story "Проверка произношения через запись голоса"
**Document type:** Use case + decomposition for downstream LLM (Claude Code) work
**Status:** Draft for PO review

---

## 0. How to read this document

Every line is tagged so derivation is transparent:

| Tag | Meaning |
|---|---|
| `[SOURCE]` | Derived directly from the provided user story. No invention. |
| `[CONVENTION]` | Added per the Lead PO 360-view + product-hypothesis standard. Flagged; a default is proposed; the decision stays with the PO. |
| `[OPEN]` | Unresolved decision. A proposed default is given so Claude Code is never blocked; ownership stays with the PO. |

Scope guard: free / open-source STT only — **no paid-per-request APIs** `[SOURCE]`. This constraint propagates into the data model, NFRs, and guardrails.

---

## 1. Product Hypothesis `[CONVENTION]`

The source story has no hypothesis. Proposed framing:

> **We believe** that adding automated pronunciation feedback (record → recognize → score) to lessons
> **will** make practice feel closer to real conversation and give learners a tight, rewarding feedback loop,
> **resulting in** higher engagement and retention for exposed learners,
> **measured by** the primary metric below, **without** regressing the guardrails.

| Type | Metric | Direction | Proposed target `[OPEN]` |
|---|---|---|---|
| **Primary** | D7 retention for cohort exposed to a speaking exercise in their first 3 sessions | ↑ | +X pp vs control (PO to set) |
| Secondary | Speaking-exercise completion rate (attempted → passed) | ↑ | ≥ 60% |
| Secondary | Lesson-completion rate for lessons containing a speaking block | ≥ baseline | no regression |
| **Guardrail** | Lesson abandonment at the speaking step (mic friction) | ↓ / flat | ≤ baseline lesson abandonment |
| **Guardrail** | Median lesson duration (lightweight feel) | flat | ≤ +Y% (PO to set) |
| **Guardrail** | STT p95 end-to-end latency | — | ≤ 5 s `[SOURCE]` |
| **Guardrail** | Per-recognition variable cost | — | $0 (OSS only) `[SOURCE]` |

---

## 2. Use-Case Overlap & Boundary Analysis `[SOURCE + CONVENTION]`

Per the pre-draft standard, candidate use cases are checked for overlap **before** writing the spec, so we don't fragment one journey into false separate UCs or fold cross-cutting concerns into the UC body.

**Candidate concerns identified in the story:** record audio · stop/delete/re-record · send to recognition · compare to expected · compute match % · show result · retry · pick task type (word/phrase/sentence).

**Resolution:**

- These are **one** primary use case (`UC-PRON-01`) with sub-flows — not three UCs. "Record", "evaluate", and "show result" are sequential steps of a single learner goal ("check my pronunciation"), so splitting them would break traceability. ✅ single UC.
- **Microphone permission** is a *precondition + cross-cutting platform concern*, not a use case. It belongs in preconditions/exception flows and in a dedicated implementation story, not in the UC's main success path. ✅ not a UC.
- **STT recognition** is a *supporting actor* (system), invoked by the UC — not a separate UC. ✅ supporting actor.
- **Scoring/comparison logic** is *domain logic* inside the UC, surfaced separately only in the task breakdown. ✅ internal step.
- **Task type (word vs phrase vs sentence)** is *input variance*, handled as a parameter of the same UC, not three UCs. ✅ parameterized.
- **Boundary (v1 vs future):** intonation, accent, speech rate, pauses, word-level highlighting, free conversation, dialogues are **out of v1** `[SOURCE]` and tracked only in §9.

**Adjacency note (no overlap, but related — owned elsewhere):** the lesson "exercise block" container and cross-session progress are *separate concerns* already in your story set. This feature plugs into the exercise block; it does not redefine it.

---

## 3. Formal Use Case Specification `[SOURCE + CONVENTION]`

### UC-PRON-01 — Check pronunciation via voice recording

| Field | Value |
|---|---|
| **Goal** | Learner pronounces the target text aloud and receives an automatic correctness score `[SOURCE]` |
| **Primary actor** | Learner `[SOURCE]` |
| **Supporting actors** | STT engine (Faster-Whisper / Whisper / Vosk / Coqui) `[SOURCE]`; Audio storage service `[CONVENTION]` |
| **Scope** | Lesson speaking exercise |
| **Level** | User goal |
| **Frequency** | High — repeatable many times per lesson `[SOURCE]` |

**Stakeholders & interests** `[CONVENTION]`
- Learner — wants fast, fair, encouraging feedback; low friction.
- Product — wants retention/engagement uplift without cost or latency blow-up.
- Engineering — wants a bounded, OSS, server-authoritative pipeline.

**Preconditions**
1. Learner is inside a lesson with a speaking exercise `[SOURCE]`.
2. Target text (word / phrase / sentence) is loaded `[SOURCE]`.
3. Microphone permission is granted for the platform `[CONVENTION]`.
4. Network connectivity to the recognition service is available `[CONVENTION / OPEN]` (default: feature requires connection in v1).

**Trigger:** Learner reaches a speaking exercise and taps record. `[SOURCE]`

**Main success scenario**
1. System displays the target word/phrase/sentence to pronounce. `[SOURCE]`
2. Learner taps **Record**. `[SOURCE]`
3. Learner speaks the text. `[SOURCE]`
4. Learner taps **Stop**; system stores the audio. `[SOURCE]`
5. System submits the audio to the STT module. `[SOURCE]`
6. STT returns recognized text; system normalizes it. `[SOURCE]` (normalization `[CONVENTION]`)
7. System compares recognized text to expected text and computes match % (words, order, missing, extra). `[SOURCE]`
8. System maps match % to status: ≥90% excellent · 75–89% passed · <75% retry. `[SOURCE]`
9. System shows: original phrase, recognized text, match %, status. `[SOURCE]`
10. System emits analytics for the attempt and its result. `[CONVENTION]`
11. Audio is auto-deleted after processing per retention policy. `[SOURCE / OPEN]`

**Alternate flows**
- **3a. Learner deletes the recording** and re-records before submitting. `[SOURCE]`
- **8a. Status = retry (<75%):** learner retries; unlimited attempts. `[SOURCE]`
- **2a. Task type = single word vs phrase vs sentence:** same flow, different expected-text length and scoring tolerance. `[SOURCE]`

**Exception flows** `[CONVENTION]`
- **E1. Mic permission denied / no microphone:** block recording, show guidance to enable mic; offer skip. (default: allow skipping the exercise, no penalty).
- **E2. Silence / no speech detected:** prompt to try again; do not call STT (cost/latency saver).
- **E3. STT timeout (>5 s) or service error:** show retryable error; do not fail the lesson.
- **E4. No network:** show offline message; allow retry when back online (default: feature gated on connectivity).
- **E5. Recognized text empty / unintelligible:** treat as <75% (retry), but show "couldn't hear you clearly" copy rather than a 0% score (motivational framing).

**Postconditions**
- *Success:* attempt scored, status shown, result + events recorded; audio handled per retention policy.
- *Failure:* learner informed, no lesson-blocking dead-end; retry available.

**Non-functional**
- End-to-end check ≤ 5 s `[SOURCE]`.
- Bounded audio file size `[SOURCE]`.
- Scoring is **server-authoritative** `[CONVENTION]` (consistency with placement-test scoring approach; prevents client tampering).
- Lightweight feel preserved — no extra full-screen blockers; inline processing state.

---

## 4. Acceptance Criteria

**From source `[SOURCE]`**
1. Learner can record a voice answer.
2. Audio is successfully submitted for processing.
3. System recognizes the spoken text.
4. Recognized text is compared to the reference.
5. Learner receives a match percentage.
6. Learner receives a pass/fail status.
7. Learner can retry an unlimited number of times.
8. Solution works without any mandatory paid API.

**Added by convention `[CONVENTION]`**
9. **Given** mic permission is denied, **when** the learner reaches the exercise, **then** they see enable-mic guidance and can skip without penalty.
10. **Given** no speech is detected, **when** the learner stops recording, **then** the system prompts a retry and does **not** consume STT.
11. **Given** STT exceeds 5 s or errors, **then** a retryable error is shown and the lesson is not blocked.
12. **Given** a result is shown, **then** original phrase, recognized text, match %, and status are all visible.
13. **Given** any attempt, **then** the defined analytics events fire with the documented payload.
14. **Given** v1 scope, **then** intonation, accent, and free-speech are **not** evaluated.
15. Scoring is computed server-side; the client cannot alter the score.

---

## 5. 360-View Coverage `[CONVENTION]`

**Edge cases:** very short words; homophones; background noise; learner speaks partial phrase; double-tap record; app backgrounded mid-recording; extremely long pause before speaking.

**Error states:** E1–E5 above.

**Platform parity:**
- iOS — `AVAudioRecorder`/native capture, `AVAudioSession` permission; format e.g. m4a/AAC. `[OPEN]`
- Android — native/`MediaRecorder`, runtime `RECORD_AUDIO` permission; format e.g. m4a/AAC. `[OPEN]`
- Web — `MediaRecorder` API, `getUserMedia` permission (HTTPS required); format e.g. WebM/Opus. `[OPEN]`
- Server transcodes any inbound format to 16 kHz mono PCM/WAV for Whisper-family models. `[OPEN — default]`

**Accessibility:**
- Record control has a clear text label + screen-reader announcement of state (idle/recording/processing).
- Result conveyed by text + status, not color alone.
- No reliance on precise timing the learner can't control; generous tap targets.
- Mic-denied path is fully operable via skip.

**Localization:**
- Recognition model selected per **course language** `[SOURCE]`, independent of **UI language**. `[CONVENTION]`
- Result/status copy localized to UI language.
- Text normalization must be language-aware (casing, punctuation, diacritics).

**Analytics events** `[CONVENTION]`

| Event | Key properties |
|---|---|
| `speaking_exercise_shown` | exercise_id, task_type, course_lang, target_len |
| `mic_permission_requested` / `_granted` / `_denied` | platform |
| `recording_started` / `_stopped` / `_deleted` / `_rerecorded` | exercise_id, duration_ms |
| `audio_submitted` | exercise_id, file_size_bytes, format |
| `stt_completed` | latency_ms, model, recognized_len |
| `stt_failed` | reason (timeout/error/no_speech) |
| `pronunciation_scored` | match_pct, status, attempt_no |
| `speaking_exercise_completed` | status, total_attempts |

**Data model / API contract** `[CONVENTION / OPEN]`

```
POST /v1/pronunciation/check
Request (multipart): audio_file, exercise_id, expected_text, course_lang
Response (JSON):
{
  "recognized_text": "string",
  "match_pct": 0-100,
  "status": "excellent" | "passed" | "retry",
  "details": { "words_matched": int, "missing": [], "extra": [], "order_score": 0-1 },
  "latency_ms": int
}
```
Storage: audio retained only until scoring completes, then auto-deleted (default). Score + event metadata persisted; raw audio not persisted in v1.

---

## 6. Implementation Breakdown — Structured Brief for Claude Code (epic → story → task)

### Context for the coding agent (read first)
- **Inspect the existing repository before assuming any tech stack** (language, frameworks, audio libs, analytics SDK, backend service layout). Do not introduce a new stack without flagging it.
- STT must be **free / open-source, no paid-per-request API**. Default engine: **Faster-Whisper** (fallback: Whisper OSS / Vosk / Coqui). `[SOURCE]`
- **Scoring is server-authoritative.** Client only records, submits, and renders.
- Treat every `[OPEN]` item as a flagged decision with the proposed default; implement the default but leave a clear TODO referencing the PO.
- Preserve product feel: lightweight, beginner-friendly, motivational, visually clean.

### Epic: Pronunciation Check via Voice Recording (Speaking Exercise v1)

**Story S1 — Audio capture & permissions (cross-platform)**
- T1.1 Request/handle mic permission on iOS, Android, Web; persist state.
- T1.2 Record controls: start, stop, delete, re-record.
- T1.3 Enforce max duration + file-size cap `[OPEN: 15 s / ~1 MB default]`.
- T1.4 Handle denied / no-mic / backgrounded states (E1) with skip path.
- T1.5 Capture in platform-native format; tag format for the backend.

**Story S2 — STT recognition service (backend, OSS)**
- T2.1 Wrap Faster-Whisper behind `/v1/pronunciation/check`; fallback engine configurable.
- T2.2 Language-aware model selection by `course_lang`.
- T2.3 Server-side transcode inbound audio → 16 kHz mono WAV/PCM.
- T2.4 Enforce ≤5 s latency budget + timeout handling (E3).
- T2.5 No-speech short-circuit (E2) before invoking the model.
- T2.6 Audio retention: auto-delete after scoring `[OPEN — default delete]`.

**Story S3 — Scoring & comparison logic (server-authoritative)**
- T3.1 Normalize expected vs recognized text (case, punctuation, diacritics, language-aware).
- T3.2 Compute match % over words + order + missing + extra (default: 1−WER with order penalty) `[OPEN]`.
- T3.3 Map to status with **configurable** thresholds (default 90 / 75) `[SOURCE]`.
- T3.4 Return structured `details` for transparency/future word-level highlight.

**Story S4 — Result UI & retry loop**
- T4.1 Processing state (inline, ≤5 s), no full-screen block.
- T4.2 Result view: original phrase, recognized text, match %, status.
- T4.3 Unlimited retry; motivational copy for low scores (E5).
- T4.4 Error-state UI for E1–E4.

**Story S5 — Lesson integration**
- T5.1 Support task types: word / phrase / sentence as one parameterized exercise.
- T5.2 Slot the speaking exercise into the lesson sequence (exercise-block contract).
- T5.3 Report completion/status back to lesson progress.

**Story S6 — Instrumentation** `[CONVENTION]`
- T6.1 Implement the analytics events in §5 with documented payloads.
- T6.2 Verify guardrail metrics are observable (latency, abandonment, duration).

**Story S7 — Accessibility & localization** `[CONVENTION]`
- T7.1 Screen-reader labels + state announcements for record control.
- T7.2 Status by text + icon (not color alone).
- T7.3 UI-language copy vs course-language recognition separation.

---

## 7. Implementation Breakdown — Flat Ticket List

| ID | Title | Type | Story |
|---|---|---|---|
| PRON-1 | Mic permission flow (iOS/Android/Web) | feat | S1 |
| PRON-2 | Record/stop/delete/re-record controls | feat | S1 |
| PRON-3 | Audio duration + size limits | feat | S1 |
| PRON-4 | Denied/no-mic/backgrounded handling + skip | feat | S1 |
| PRON-5 | `/v1/pronunciation/check` endpoint (Faster-Whisper) | feat | S2 |
| PRON-6 | Language-aware model selection | feat | S2 |
| PRON-7 | Server-side audio transcode | feat | S2 |
| PRON-8 | Latency budget + timeout handling | feat | S2 |
| PRON-9 | No-speech short-circuit | feat | S2 |
| PRON-10 | Audio retention / auto-delete | feat | S2 |
| PRON-11 | Text normalization (language-aware) | feat | S3 |
| PRON-12 | Match % algorithm (words/order/missing/extra) | feat | S3 |
| PRON-13 | Configurable thresholds + status mapping | feat | S3 |
| PRON-14 | Scoring details payload | feat | S3 |
| PRON-15 | Inline processing state | feat | S4 |
| PRON-16 | Result view (phrase/recognized/%/status) | feat | S4 |
| PRON-17 | Unlimited retry + motivational copy | feat | S4 |
| PRON-18 | Error-state UI (E1–E4) | feat | S4 |
| PRON-19 | Task types word/phrase/sentence | feat | S5 |
| PRON-20 | Lesson sequence integration | feat | S5 |
| PRON-21 | Progress/status reporting | feat | S5 |
| PRON-22 | Analytics events | feat | S6 |
| PRON-23 | Guardrail metric observability | feat | S6 |
| PRON-24 | A11y for record control | feat | S7 |
| PRON-25 | UI-lang vs course-lang separation | feat | S7 |

---

## 8. Open Questions & Proposed Defaults `[OPEN]` — owner: PO (Alexander)

| # | Question | Proposed default |
|---|---|---|
| 1 | Primary-metric target (D7 uplift) and guardrail thresholds (duration +Y%) | PO to set numeric targets |
| 2 | Match % algorithm | 1 − WER with word-order penalty |
| 3 | Score thresholds | 90 / 75 (configurable) `[SOURCE]` |
| 4 | Max recording length / file size | 15 s / ~1 MB |
| 5 | Faster-Whisper model size (latency vs accuracy) | `base` (revisit per language) |
| 6 | Audio retention | delete after scoring; persist no raw audio |
| 7 | Offline behavior | feature requires connectivity in v1 |
| 8 | Mic-denied behavior | allow skip, no penalty |
| 9 | Capture/transport audio formats per platform | native capture → server transcode to 16 kHz WAV |

---

## 9. Out of Scope (v1) / Future `[SOURCE]`

Not evaluated in v1: intonation, accent, free speech, written-speech check.
Future versions: per-word pronunciation analysis, mispronounced-word highlighting, speech-rate analysis, pause analysis, accent scoring, free conversation with AI, dialogue exercises.
