import { useEffect, useRef, useState } from 'react';

import { Alert, GlassCard } from '../../components/ui';
import Button from '../../components/atoms/Button';
import { track } from '../../lib/analytics';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import {
  checkPronunciation,
  PronunciationError,
  type PronunciationErrorKind,
  type PronunciationResult,
  type TaskType,
} from '../../lib/pronunciationService';
import { COPY } from './copy';

const PLATFORM = 'web';

export interface PronunciationExerciseProps {
  exerciseId:     string;
  expectedText:   string;
  courseLang:     string;          // recognition language, independent of UI language (S7.3)
  taskType?:      TaskType;
  maxDurationMs?: number;
  onSkip?:        () => void;      // E1: allow skipping without penalty
}

function errorCopy(kind: PronunciationErrorKind): string {
  switch (kind) {
    case 'timeout':   return COPY.errors.timeout;
    case 'too_large': return COPY.errors.tooLarge;
    case 'network':   return COPY.errors.network;
    default:          return COPY.errors.generic;
  }
}

export default function PronunciationExercise({
  exerciseId,
  expectedText,
  courseLang,
  taskType = 'phrase',
  maxDurationMs = 15_000,
  onSkip,
}: PronunciationExerciseProps) {
  const recorder = useAudioRecorder(maxDurationMs);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]         = useState<PronunciationResult | null>(null);
  const [errorKind, setErrorKind]   = useState<PronunciationErrorKind | null>(null);
  const [attemptNo, setAttemptNo]   = useState(1);

  // Fire speaking_exercise_shown once per mounted exercise.
  useEffect(() => {
    track('speaking_exercise_shown', {
      exercise_id: exerciseId,
      task_type:   taskType,
      course_lang: courseLang,
      target_len:  expectedText.trim().split(/\s+/).filter(Boolean).length,
    });
  }, [exerciseId, taskType, courseLang, expectedText]);

  // Emit permission / recording analytics on recorder state transitions.
  const prevStatus = useRef(recorder.status);
  useEffect(() => {
    const prev = prevStatus.current;
    const cur  = recorder.status;
    if (prev !== cur) {
      if (cur === 'recording') {
        track('mic_permission_granted', { platform: PLATFORM });
        track('recording_started', { exercise_id: exerciseId, duration_ms: 0 });
      } else if (cur === 'denied') {
        track('mic_permission_denied', { platform: PLATFORM });
      } else if (cur === 'recorded') {
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
    if (!recorder.blob) return;
    setSubmitting(true);
    setErrorKind(null);
    try {
      const res = await checkPronunciation({
        audio:        recorder.blob,
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
    } catch (err) {
      setErrorKind(err instanceof PronunciationError ? err.kind : 'server');
    } finally {
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

  return (
    <GlassCard className="w-full max-w-[560px] mx-auto p-6 sm:p-8 flex flex-col gap-5">
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--c-orange)]">
        {COPY.eyebrow}
      </p>

      {/* Target phrase — always visible, even on the result screen (AC #12). */}
      <div>
        <p className="text-sm text-[var(--text-tertiary)] mb-1">{COPY.prompt}</p>
        <p lang={courseLang} className="text-2xl font-black text-[var(--text-primary)]">
          {expectedText}
        </p>
      </div>

      {/* Polite live region announces state changes for screen readers (S7.1). */}
      <div aria-live="polite" className="sr-only">
        {recorder.status === 'recording' && COPY.a11y.recordingState}
        {submitting && COPY.a11y.processingState}
      </div>

      {/* ─── Blocked: mic denied / unsupported (E1) ─── */}
      {blocked && (
        <div className="flex flex-col gap-3">
          <Alert
            type="error"
            message={recorder.status === 'denied' ? COPY.errors.micDenied : COPY.errors.unsupported}
          />
          <div className="flex gap-3">
            {recorder.status === 'denied' && (
              <Button variant="outline" onClick={handleRecord}>{COPY.retry}</Button>
            )}
            {onSkip && <Button variant="ghost" onClick={onSkip}>{COPY.skip}</Button>}
          </div>
        </div>
      )}

      {/* ─── Result view (S4.2) ─── */}
      {result && !blocked && (
        <ResultView result={result} attemptNo={attemptNo} onRetry={handleRetry} onSkip={onSkip} />
      )}

      {/* ─── Capture / review controls ─── */}
      {!result && !blocked && (
        <div className="flex flex-col gap-4">
          {errorKind && <Alert type="error" message={errorCopy(errorKind)} />}

          {(recorder.status === 'idle' || recorder.status === 'requesting') && (
            <Button onClick={handleRecord} disabled={recorder.status === 'requesting'} ariaLabel={COPY.a11y.recordBtn}>
              {recorder.status === 'requesting' ? COPY.requesting : COPY.record}
            </Button>
          )}

          {recorder.status === 'recording' && (
            <div className="flex flex-col items-center gap-2">
              <span className="flex items-center gap-2 text-[var(--state-wrong)] font-semibold">
                <span className="w-3 h-3 rounded-full bg-[var(--state-wrong)] animate-pulse" aria-hidden="true" />
                {COPY.recording}
              </span>
              <Button variant="outline" onClick={recorder.stop} ariaLabel={COPY.a11y.stopBtn}>
                {COPY.stop}
              </Button>
            </div>
          )}

          {recorder.status === 'recorded' && (
            <div className="flex flex-col gap-3">
              {recorder.url && (
                <audio controls src={recorder.url} aria-label={COPY.a11y.playback} className="w-full" />
              )}
              <div className="flex gap-3">
                <Button onClick={handleSubmit} disabled={submitting}>
                  {submitting ? COPY.processing : COPY.submit}
                </Button>
                <Button variant="outline" onClick={handleDelete} disabled={submitting}>
                  {COPY.rerecord}
                </Button>
              </div>
            </div>
          )}

          {onSkip && recorder.status !== 'recording' && (
            <button
              onClick={onSkip}
              className="text-sm text-[var(--text-tertiary)] underline self-center cursor-pointer"
            >
              {COPY.skip}
            </button>
          )}
        </div>
      )}
    </GlassCard>
  );
}

function ResultView({
  result,
  attemptNo,
  onRetry,
  onSkip,
}: {
  result:    PronunciationResult;
  attemptNo: number;
  onRetry:   () => void;
  onSkip?:   () => void;
}) {
  const badge = COPY.result[result.status];
  // E5: empty/unintelligible — motivational copy instead of a bare 0%.
  const unclear = result.status === 'retry' && result.recognized_text.trim() === '';

  return (
    <div className="flex flex-col gap-4" data-testid="pronunciation-result">
      <div className="flex items-center gap-3">
        <span className="text-3xl" aria-hidden="true">{badge.icon}</span>
        <div>
          <p className="text-lg font-black text-[var(--text-primary)]">{badge.label}</p>
          {!unclear && (
            <p className="text-sm text-[var(--text-secondary)]">{COPY.result.match(result.match_pct)}</p>
          )}
        </div>
      </div>

      {unclear ? (
        <Alert type="error" message={COPY.result.unclear} />
      ) : (
        <div className="text-sm flex flex-col gap-1">
          <p>
            <span className="text-[var(--text-tertiary)]">{COPY.result.youSaid} </span>
            <span className="text-[var(--text-primary)] font-semibold" data-testid="recognized-text">
              {result.recognized_text}
            </span>
          </p>
        </div>
      )}

      <div className="flex gap-3">
        {/* Unlimited retries (AC #7). */}
        <Button onClick={onRetry}>{COPY.retry}</Button>
        {onSkip && <Button variant="ghost" onClick={onSkip}>{COPY.skip}</Button>}
      </div>
      <p className="sr-only">Attempt number {attemptNo}</p>
    </div>
  );
}
