type EventPayloads = {
    onboarding_prior_experience_answered: {
        studied_before: boolean;
    };
    placement_test_started: {
        session_id: string;
    };
    placement_level_completed: {
        session_id: string;
        level: string;
        errors: number;
        passed: boolean;
    };
    placement_test_completed: {
        session_id: string;
        recommended_level: string;
    };
    placement_level_override_used: {
        session_id: string;
        recommended_level: string;
        chosen_level: string;
    };
    placement_level_confirmed: {
        session_id: string;
        confirmed_level: string;
    };
    learning_started: {
        confirmed_level: string;
        via: "placement" | "default_a1";
    };
    speaking_exercise_shown: {
        exercise_id: string;
        task_type: string;
        course_lang: string;
        target_len: number;
    };
    mic_permission_requested: {
        platform: string;
    };
    mic_permission_granted: {
        platform: string;
    };
    mic_permission_denied: {
        platform: string;
    };
    recording_started: {
        exercise_id: string;
        duration_ms: number;
    };
    recording_stopped: {
        exercise_id: string;
        duration_ms: number;
    };
    recording_deleted: {
        exercise_id: string;
        duration_ms: number;
    };
    recording_rerecorded: {
        exercise_id: string;
        duration_ms: number;
    };
    speaking_exercise_completed: {
        status: string;
        total_attempts: number;
    };
};
type EventName = keyof EventPayloads;
declare let sink: <N extends EventName>(name: N, payload: EventPayloads[N]) => void;
export declare function setAnalyticsSink(fn: typeof sink): void;
export declare function track<N extends EventName>(name: N, payload: EventPayloads[N]): void;
export {};
