import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { Alert, GlassCard } from '../../components/ui';
import Button from '../../components/atoms/Button';
import { track } from '../../lib/analytics';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { checkPronunciation, PronunciationError, } from '../../lib/pronunciationService';
import { COPY } from './copy';
const PLATFORM = 'web';
function errorCopy(kind) {
    switch (kind) {
        case 'timeout': return COPY.errors.timeout;
        case 'too_large': return COPY.errors.tooLarge;
        case 'network': return COPY.errors.network;
        default: return COPY.errors.generic;
    }
}
export default function PronunciationExercise({ exerciseId, expectedText, courseLang, taskType = 'phrase', maxDurationMs = 15_000, onSkip, }) {
    const recorder = useAudioRecorder(maxDurationMs);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [errorKind, setErrorKind] = useState(null);
    const [attemptNo, setAttemptNo] = useState(1);
    // Fire speaking_exercise_shown once per mounted exercise.
    useEffect(() => {
        track('speaking_exercise_shown', {
            exercise_id: exerciseId,
            task_type: taskType,
            course_lang: courseLang,
            target_len: expectedText.trim().split(/\s+/).filter(Boolean).length,
        });
    }, [exerciseId, taskType, courseLang, expectedText]);
    // Emit permission / recording analytics on recorder state transitions.
    const prevStatus = useRef(recorder.status);
    useEffect(() => {
        const prev = prevStatus.current;
        const cur = recorder.status;
        if (prev !== cur) {
            if (cur === 'recording') {
                track('mic_permission_granted', { platform: PLATFORM });
                track('recording_started', { exercise_id: exerciseId, duration_ms: 0 });
            }
            else if (cur === 'denied') {
                track('mic_permission_denied', { platform: PLATFORM });
            }
            else if (cur === 'recorded') {
                track('recording_stopped', { exercise_id: exerciseId, duration_ms: recorder.durationMs });
            }
            prevStatus.current = cur;
        }
    }, [recorder.status, recorder.durationMs, exerciseId]);
    function handleRecord() {
        setErrorKind(null);
        track('mic_permission_requested', { platform: PLATFORM });
        void recorder.start();
    }
    function handleDelete() {
        track('recording_deleted', { exercise_id: exerciseId, duration_ms: recorder.durationMs });
        recorder.reset();
    }
    async function handleSubmit() {
        if (!recorder.blob)
            return;
        setSubmitting(true);
        setErrorKind(null);
        try {
            const res = await checkPronunciation({
                audio: recorder.blob,
                exerciseId,
                expectedText,
                courseLang,
                taskType,
                attemptNo,
            });
            setResult(res);
            if (res.status !== 'retry') {
                track('speaking_exercise_completed', { status: res.status, total_attempts: attemptNo });
            }
        }
        catch (err) {
            setErrorKind(err instanceof PronunciationError ? err.kind : 'server');
        }
        finally {
            setSubmitting(false);
        }
    }
    function handleRetry() {
        track('recording_rerecorded', { exercise_id: exerciseId, duration_ms: recorder.durationMs });
        setResult(null);
        setErrorKind(null);
        setAttemptNo((n) => n + 1);
        recorder.reset();
    }
    const blocked = recorder.status === 'denied' || recorder.status === 'unsupported';
    return (_jsxs(GlassCard, { className: "w-full max-w-[560px] mx-auto p-6 sm:p-8 flex flex-col gap-5", children: [_jsx("p", { className: "text-xs font-bold uppercase tracking-wider text-[var(--c-orange)]", children: COPY.eyebrow }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-[var(--text-tertiary)] mb-1", children: COPY.prompt }), _jsx("p", { lang: courseLang, className: "text-2xl font-black text-[var(--text-primary)]", children: expectedText })] }), _jsxs("div", { "aria-live": "polite", className: "sr-only", children: [recorder.status === 'recording' && COPY.a11y.recordingState, submitting && COPY.a11y.processingState] }), blocked && (_jsxs("div", { className: "flex flex-col gap-3", children: [_jsx(Alert, { type: "error", message: recorder.status === 'denied' ? COPY.errors.micDenied : COPY.errors.unsupported }), _jsxs("div", { className: "flex gap-3", children: [recorder.status === 'denied' && (_jsx(Button, { variant: "outline", onClick: handleRecord, children: COPY.retry })), onSkip && _jsx(Button, { variant: "ghost", onClick: onSkip, children: COPY.skip })] })] })), result && !blocked && (_jsx(ResultView, { result: result, attemptNo: attemptNo, onRetry: handleRetry, onSkip: onSkip })), !result && !blocked && (_jsxs("div", { className: "flex flex-col gap-4", children: [errorKind && _jsx(Alert, { type: "error", message: errorCopy(errorKind) }), (recorder.status === 'idle' || recorder.status === 'requesting') && (_jsx(Button, { onClick: handleRecord, disabled: recorder.status === 'requesting', ariaLabel: COPY.a11y.recordBtn, children: recorder.status === 'requesting' ? COPY.requesting : COPY.record })), recorder.status === 'recording' && (_jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsxs("span", { className: "flex items-center gap-2 text-[var(--state-wrong)] font-semibold", children: [_jsx("span", { className: "w-3 h-3 rounded-full bg-[var(--state-wrong)] animate-pulse", "aria-hidden": "true" }), COPY.recording] }), _jsx(Button, { variant: "outline", onClick: recorder.stop, ariaLabel: COPY.a11y.stopBtn, children: COPY.stop })] })), recorder.status === 'recorded' && (_jsxs("div", { className: "flex flex-col gap-3", children: [recorder.url && (_jsx("audio", { controls: true, src: recorder.url, "aria-label": COPY.a11y.playback, className: "w-full" })), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { onClick: handleSubmit, disabled: submitting, children: submitting ? COPY.processing : COPY.submit }), _jsx(Button, { variant: "outline", onClick: handleDelete, disabled: submitting, children: COPY.rerecord })] })] })), onSkip && recorder.status !== 'recording' && (_jsx("button", { onClick: onSkip, className: "text-sm text-[var(--text-tertiary)] underline self-center cursor-pointer", children: COPY.skip }))] }))] }));
}
function ResultView({ result, attemptNo, onRetry, onSkip, }) {
    const badge = COPY.result[result.status];
    // E5: empty/unintelligible — motivational copy instead of a bare 0%.
    const unclear = result.status === 'retry' && result.recognized_text.trim() === '';
    return (_jsxs("div", { className: "flex flex-col gap-4", "data-testid": "pronunciation-result", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("span", { className: "text-3xl", "aria-hidden": "true", children: badge.icon }), _jsxs("div", { children: [_jsx("p", { className: "text-lg font-black text-[var(--text-primary)]", children: badge.label }), !unclear && (_jsx("p", { className: "text-sm text-[var(--text-secondary)]", children: COPY.result.match(result.match_pct) }))] })] }), unclear ? (_jsx(Alert, { type: "error", message: COPY.result.unclear })) : (_jsx("div", { className: "text-sm flex flex-col gap-1", children: _jsxs("p", { children: [_jsxs("span", { className: "text-[var(--text-tertiary)]", children: [COPY.result.youSaid, " "] }), _jsx("span", { className: "text-[var(--text-primary)] font-semibold", "data-testid": "recognized-text", children: result.recognized_text })] }) })), _jsxs("div", { className: "flex gap-3", children: [_jsx(Button, { onClick: onRetry, children: COPY.retry }), onSkip && _jsx(Button, { variant: "ghost", onClick: onSkip, children: COPY.skip })] }), _jsxs("p", { className: "sr-only", children: ["Attempt number ", attemptNo] })] }));
}
