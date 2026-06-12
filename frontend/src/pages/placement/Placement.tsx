import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  answerPriorExperience,
  confirmLevel,
  getLevelBlock,
  getResult,
  submitLevelAnswers,
  type CefrLevel,
  type LevelBlock,
} from "../../lib/placementService";
import { track } from "../../lib/analytics";

import PriorExperienceStep from "./steps/PriorExperienceStep";
import VocabMatchStep      from "./steps/VocabMatchStep";
import SentenceBuildStep   from "./steps/SentenceBuildStep";
import ConfirmStep         from "./steps/ConfirmStep";
import { COPY } from "./copy";
import * as storage from "./placementStorage";

/**
 * Placement-test orchestrator (story §4).
 *
 * Phases:
 *   gate       → ask "studied before?"
 *   vocab/sent → per-level test loop (vocab paginated 5-at-a-time, then sentences)
 *   confirm    → recommended + optional +1 override
 *
 * The two state machines worth re-reading before editing:
 *
 * 1. **answers buffer**. The story (§4.4) measures one CEFR block as a
 *    single 25-item submission. We accumulate vocab + sentence answers in
 *    component state, then POST once to `/placement/{sid}/level/{lvl}/answers`.
 *    A mid-block refresh would lose buffered answers — acceptable; the
 *    server still authoritatively scores whatever was submitted (or zero).
 *
 * 2. **resume on "yes"**. The backend's prior-experience handler returns the
 *    user's *existing* in-progress session if one exists (§5.1), so a user
 *    who navigates back into this page mid-test picks up at their current
 *    level rather than restarting from A1.
 */

type Phase = "gate" | "vocab" | "sentence" | "confirm" | "error";

interface State {
  phase:        Phase;
  sessionId:    string | null;
  level:        CefrLevel | null;
  block:        LevelBlock | null;
  recommended:  CefrLevel | null;
  allowedMax:   CefrLevel | null;
  vocabAnswers: Record<string, string>;
  busy:         boolean;
  error:        string | null;
}

const initial: State = {
  phase:        "gate",
  sessionId:    null,
  level:        null,
  block:        null,
  recommended:  null,
  allowedMax:   null,
  vocabAnswers: {},
  busy:         false,
  error:        null,
};

/** Lazy-initialized so any persisted session boots the orchestrator
 *  straight into the resume flow — no synchronous setState in the effect
 *  (lint: react-hooks/set-state-in-effect). The effect's only job is the
 *  async block fetch. */
function initialFromStorage(): State {
  const persisted = storage.load();
  if (!persisted) return initial;
  return {
    ...initial,
    sessionId: persisted.sessionId,
    level:     persisted.level,
    // Stay in `gate` while the effect fetches the block; render shows a
    // spinner because no concrete phase predicate matches yet.
    phase:     "gate",
    busy:      true,
  };
}

export default function Placement() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>(initialFromStorage);

  const fail = useCallback((err: unknown) => {
    const msg = err instanceof Error ? err.message : COPY.errors.generic;
    // A failed call typically means a stale session id (404) or expired
    // state (400). Clear so "Start over" actually starts over.
    storage.clear();
    setState(s => ({ ...s, phase: "error", busy: false, error: msg }));
  }, []);

  // ── resume on mount (§5.1) ───────────────────────────────────────────
  // initialFromStorage() above seeded sessionId/level/busy synchronously.
  // This effect just performs the async block fetch and either lands the
  // user in `vocab` or clears the stale state back to the gate.
  useEffect(() => {
    if (!state.sessionId || !state.level) return;
    let cancelled = false;
    const sid = state.sessionId;
    const lvl = state.level;
    (async () => {
      try {
        const block = await getLevelBlock(sid, lvl);
        if (cancelled) return;
        setState(s => ({ ...s, phase: "vocab", block, vocabAnswers: {}, busy: false }));
      } catch {
        // 404 / 400 → server no longer recognizes the session. Drop the
        // stale id and let the user re-enter via the gate.
        if (cancelled) return;
        storage.clear();
        setState(initial);
      }
    })();
    return () => { cancelled = true; };
    // sessionId/level only change as part of mount-time resume; intentional
    // single-run effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── gate → either fast-path to /dashboard or start the test ──────────
  const handleGate = useCallback(async (studiedBefore: boolean) => {
    setState(s => ({ ...s, busy: true, error: null }));
    track("onboarding_prior_experience_answered", { studied_before: studiedBefore });
    try {
      const res = await answerPriorExperience(studiedBefore);
      if (!res.test_required) {
        track("learning_started", { confirmed_level: res.level, via: "default_a1" });
        navigate("/dashboard", { replace: true });
        return;
      }
      if (!res.block || !res.current_level) {
        fail(new Error(COPY.errors.generic));
        return;
      }
      track("placement_test_started", { session_id: res.session_id });
      storage.save({ sessionId: res.session_id, level: res.current_level });
      setState(s => ({
        ...s,
        phase:        "vocab",
        sessionId:    res.session_id,
        level:        res.current_level,
        block:        res.block,
        vocabAnswers: {},
        busy:         false,
      }));
    } catch (err) {
      fail(err);
    }
  }, [navigate, fail]);

  // ── vocab done → switch to sentence builder for the same block ───────
  const handleVocabComplete = useCallback((answers: Record<string, string>) => {
    setState(s => ({ ...s, phase: "sentence", vocabAnswers: answers }));
  }, []);

  // ── sentence done → POST the level, advance or finish ────────────────
  const handleSentenceComplete = useCallback(async (sentenceAnswers: Record<string, string[]>) => {
    if (!state.sessionId || !state.level) return;
    setState(s => ({ ...s, busy: true, error: null }));
    try {
      const res = await submitLevelAnswers(state.sessionId, state.level, {
        vocab:    state.vocabAnswers,
        sentence: sentenceAnswers,
      });
      track("placement_level_completed", {
        session_id: state.sessionId,
        level:      res.level,
        errors:     res.errors,
        passed:     res.passed,
      });

      if (res.next_level) {
        const next = await getLevelBlock(state.sessionId, res.next_level);
        storage.save({ sessionId: state.sessionId, level: res.next_level });
        setState(s => ({
          ...s,
          phase:        "vocab",
          level:        res.next_level,
          block:        next,
          vocabAnswers: {},
          busy:         false,
        }));
        return;
      }

      const result = await getResult(state.sessionId);
      track("placement_test_completed", {
        session_id:        state.sessionId,
        recommended_level: result.recommended_level,
      });
      setState(s => ({
        ...s,
        phase:       "confirm",
        recommended: result.recommended_level,
        allowedMax:  result.allowed_max_level,
        busy:        false,
      }));
    } catch (err) {
      fail(err);
    }
  }, [state.sessionId, state.level, state.vocabAnswers, fail]);

  // ── confirm → persist, go to dashboard ───────────────────────────────
  const handleConfirm = useCallback(async (chosen: CefrLevel) => {
    if (!state.sessionId || !state.recommended) return;
    setState(s => ({ ...s, busy: true, error: null }));
    try {
      if (chosen !== state.recommended) {
        track("placement_level_override_used", {
          session_id:        state.sessionId,
          recommended_level: state.recommended,
          chosen_level:      chosen,
        });
      }
      const res = await confirmLevel(state.sessionId, chosen);
      track("placement_level_confirmed", {
        session_id:      state.sessionId,
        confirmed_level: res.confirmed_level,
      });
      track("learning_started", { confirmed_level: res.confirmed_level, via: "placement" });
      storage.clear();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      fail(err);
    }
  }, [state.sessionId, state.recommended, navigate, fail]);

  // ── render ───────────────────────────────────────────────────────────
  if (state.phase === "error") {
    return (
      <div className="max-w-[520px] mx-auto py-14 px-6 text-center">
        <div className="text-[40px] mb-4">😕</div>
        <p className="text-[var(--text-primary)] font-semibold mb-4">{state.error}</p>
        <button
          type="button"
          onClick={() => setState(initial)}
          className="py-3 px-6 rounded-[14px] border-none bg-[var(--grad-purple-green)] text-white font-bold cursor-pointer"
        >
          Start over
        </button>
      </div>
    );
  }

  if (state.phase === "gate") {
    return <PriorExperienceStep busy={state.busy} onAnswer={handleGate} />;
  }

  if (state.phase === "vocab" && state.block && state.level) {
    return (
      <VocabMatchStep
        level={state.level}
        items={state.block.vocab}
        pageSize={state.block.vocab_page_size}
        onComplete={handleVocabComplete}
      />
    );
  }

  if (state.phase === "sentence" && state.block && state.level) {
    return (
      <SentenceBuildStep
        level={state.level}
        items={state.block.sentence}
        onComplete={handleSentenceComplete}
      />
    );
  }

  if (state.phase === "confirm" && state.recommended && state.allowedMax) {
    return (
      <ConfirmStep
        recommended={state.recommended}
        allowedMax={state.allowedMax}
        busy={state.busy}
        onConfirm={handleConfirm}
      />
    );
  }

  // Loading transitions between phases.
  return (
    <div className="min-h-[400px] flex items-center justify-center">
      <div className="w-10 h-10 border-[3px] border-[var(--border-medium)] border-t-[var(--c-orange)] rounded-full animate-spin" />
    </div>
  );
}
