// Placement analytics — minimal sink so the §5.5 events ship with the
// feature even before a real SDK (Mixpanel / Segment / Amplitude) is wired
// in. The seven event names are exactly those listed in the story; do not
// rename without updating the analytics doc.
//
// Wiring later: replace `emit()` with a call into the SDK. The shapes here
// are stable, so a one-line swap is enough.

type EventPayloads = {
  onboarding_prior_experience_answered: { studied_before: boolean };
  placement_test_started:               { session_id: string };
  placement_level_completed:            { session_id: string; level: string; errors: number; passed: boolean };
  placement_test_completed:             { session_id: string; recommended_level: string };
  placement_level_override_used:        { session_id: string; recommended_level: string; chosen_level: string };
  placement_level_confirmed:            { session_id: string; confirmed_level: string };
  learning_started:                     { confirmed_level: string; via: "placement" | "default_a1" };

  // Speaking / pronunciation (story §5). Client-owned events; the backend
  // emits audio_submitted / stt_completed / stt_failed / pronunciation_scored.
  speaking_exercise_shown:      { exercise_id: string; task_type: string; course_lang: string; target_len: number };
  mic_permission_requested:     { platform: string };
  mic_permission_granted:       { platform: string };
  mic_permission_denied:        { platform: string };
  recording_started:            { exercise_id: string; duration_ms: number };
  recording_stopped:            { exercise_id: string; duration_ms: number };
  recording_deleted:            { exercise_id: string; duration_ms: number };
  recording_rerecorded:         { exercise_id: string; duration_ms: number };
  speaking_exercise_completed:  { status: string; total_attempts: number };
};

type EventName = keyof EventPayloads;

let sink: <N extends EventName>(name: N, payload: EventPayloads[N]) => void = (name, payload) => {
  console.info(`[analytics] ${name}`, payload);
};

// Test seam: swap the sink in unit tests.
export function setAnalyticsSink(fn: typeof sink): void {
  sink = fn;
}

export function track<N extends EventName>(name: N, payload: EventPayloads[N]): void {
  try {
    sink(name, payload);
  } catch {
    // Analytics must never break the user flow.
  }
}
