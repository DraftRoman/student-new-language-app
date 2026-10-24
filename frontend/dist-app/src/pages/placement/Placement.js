import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { answerPriorExperience, confirmLevel, getLevelBlock, getResult, submitLevelAnswers, } from "../../lib/placementService";
import { track } from "../../lib/analytics";
import PriorExperienceStep from "./steps/PriorExperienceStep";
import VocabMatchStep from "./steps/VocabMatchStep";
import SentenceBuildStep from "./steps/SentenceBuildStep";
import ConfirmStep from "./steps/ConfirmStep";
import { COPY } from "./copy";
import * as storage from "./placementStorage";
const initial = {
    phase: "gate",
    sessionId: null,
    level: null,
    block: null,
    recommended: null,
    allowedMax: null,
    vocabAnswers: {},
    busy: false,
    error: null,
};
/** Lazy-initialized so any persisted session boots the orchestrator
 *  straight into the resume flow — no synchronous setState in the effect
 *  (lint: react-hooks/set-state-in-effect). The effect's only job is the
 *  async block fetch. */
function initialFromStorage() {
    const persisted = storage.load();
    if (!persisted)
        return initial;
    return {
        ...initial,
        sessionId: persisted.sessionId,
        level: persisted.level,
        // Stay in `gate` while the effect fetches the block; render shows a
        // spinner because no concrete phase predicate matches yet.
        phase: "gate",
        busy: true,
    };
}
export default function Placement() {
    const navigate = useNavigate();
    const [state, setState] = useState(initialFromStorage);
    const fail = useCallback((err) => {
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
        if (!state.sessionId || !state.level)
            return;
        let cancelled = false;
        const sid = state.sessionId;
        const lvl = state.level;
        (async () => {
            try {
                const block = await getLevelBlock(sid, lvl);
                if (cancelled)
                    return;
                setState(s => ({ ...s, phase: "vocab", block, vocabAnswers: {}, busy: false }));
            }
            catch {
                // 404 / 400 → server no longer recognizes the session. Drop the
                // stale id and let the user re-enter via the gate.
                if (cancelled)
                    return;
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
    const handleGate = useCallback(async (studiedBefore) => {
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
                phase: "vocab",
                sessionId: res.session_id,
                level: res.current_level,
                block: res.block,
                vocabAnswers: {},
                busy: false,
            }));
        }
        catch (err) {
            fail(err);
        }
    }, [navigate, fail]);
    // ── vocab done → switch to sentence builder for the same block ───────
    const handleVocabComplete = useCallback((answers) => {
        setState(s => ({ ...s, phase: "sentence", vocabAnswers: answers }));
    }, []);
    // ── sentence done → POST the level, advance or finish ────────────────
    const handleSentenceComplete = useCallback(async (sentenceAnswers) => {
        if (!state.sessionId || !state.level)
            return;
        setState(s => ({ ...s, busy: true, error: null }));
        try {
            const res = await submitLevelAnswers(state.sessionId, state.level, {
                vocab: state.vocabAnswers,
                sentence: sentenceAnswers,
            });
            track("placement_level_completed", {
                session_id: state.sessionId,
                level: res.level,
                errors: res.errors,
                passed: res.passed,
            });
            if (res.next_level) {
                const next = await getLevelBlock(state.sessionId, res.next_level);
                storage.save({ sessionId: state.sessionId, level: res.next_level });
                setState(s => ({
                    ...s,
                    phase: "vocab",
                    level: res.next_level,
                    block: next,
                    vocabAnswers: {},
                    busy: false,
                }));
                return;
            }
            const result = await getResult(state.sessionId);
            track("placement_test_completed", {
                session_id: state.sessionId,
                recommended_level: result.recommended_level,
            });
            setState(s => ({
                ...s,
                phase: "confirm",
                recommended: result.recommended_level,
                allowedMax: result.allowed_max_level,
                busy: false,
            }));
        }
        catch (err) {
            fail(err);
        }
    }, [state.sessionId, state.level, state.vocabAnswers, fail]);
    // ── confirm → persist, go to dashboard ───────────────────────────────
    const handleConfirm = useCallback(async (chosen) => {
        if (!state.sessionId || !state.recommended)
            return;
        setState(s => ({ ...s, busy: true, error: null }));
        try {
            if (chosen !== state.recommended) {
                track("placement_level_override_used", {
                    session_id: state.sessionId,
                    recommended_level: state.recommended,
                    chosen_level: chosen,
                });
            }
            const res = await confirmLevel(state.sessionId, chosen);
            track("placement_level_confirmed", {
                session_id: state.sessionId,
                confirmed_level: res.confirmed_level,
            });
            track("learning_started", { confirmed_level: res.confirmed_level, via: "placement" });
            storage.clear();
            navigate("/dashboard", { replace: true });
        }
        catch (err) {
            fail(err);
        }
    }, [state.sessionId, state.recommended, navigate, fail]);
    // ── render ───────────────────────────────────────────────────────────
    if (state.phase === "error") {
        return (_jsxs("div", { className: "max-w-[520px] mx-auto py-14 px-6 text-center", children: [_jsx("div", { className: "text-[40px] mb-4", children: "\uD83D\uDE15" }), _jsx("p", { className: "text-[var(--text-primary)] font-semibold mb-4", children: state.error }), _jsx("button", { type: "button", onClick: () => setState(initial), className: "py-3 px-6 rounded-[14px] border-none bg-[var(--grad-purple-green)] text-white font-bold cursor-pointer", children: "Start over" })] }));
    }
    if (state.phase === "gate") {
        return _jsx(PriorExperienceStep, { busy: state.busy, onAnswer: handleGate });
    }
    if (state.phase === "vocab" && state.block && state.level) {
        return (_jsx(VocabMatchStep, { level: state.level, items: state.block.vocab, pageSize: state.block.vocab_page_size, onComplete: handleVocabComplete }));
    }
    if (state.phase === "sentence" && state.block && state.level) {
        return (_jsx(SentenceBuildStep, { level: state.level, items: state.block.sentence, onComplete: handleSentenceComplete }));
    }
    if (state.phase === "confirm" && state.recommended && state.allowedMax) {
        return (_jsx(ConfirmStep, { recommended: state.recommended, allowedMax: state.allowedMax, busy: state.busy, onConfirm: handleConfirm }));
    }
    // Loading transitions between phases.
    return (_jsx("div", { className: "min-h-[400px] flex items-center justify-center", children: _jsx("div", { className: "w-10 h-10 border-[3px] border-[var(--border-medium)] border-t-[var(--c-orange)] rounded-full animate-spin" }) }));
}
