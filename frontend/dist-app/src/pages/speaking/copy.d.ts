export declare const COPY: {
    readonly eyebrow: "Say it out loud";
    readonly prompt: "Pronounce this:";
    readonly record: "● Record";
    readonly stop: "■ Stop";
    readonly recording: "Recording… tap stop when you’re done";
    readonly requesting: "Allow microphone access to continue…";
    readonly processing: "Checking your pronunciation…";
    readonly rerecord: "Re-record";
    readonly submit: "Check pronunciation";
    readonly retry: "Try again";
    readonly skip: "Skip for now";
    readonly result: {
        readonly heading: "Your result";
        readonly youSaid: "We heard:";
        readonly target: "Target:";
        readonly match: (pct: number) => string;
        readonly excellent: {
            readonly icon: "🎉";
            readonly label: "Excellent!";
        };
        readonly passed: {
            readonly icon: "👍";
            readonly label: "Passed";
        };
        readonly retry: {
            readonly icon: "🔁";
            readonly label: "Keep practising";
        };
        readonly unclear: "We couldn’t hear you clearly — give it another go.";
    };
    readonly status: {
        readonly granted: "announced for screen readers";
    };
    readonly a11y: {
        readonly recordBtn: "Start recording your pronunciation";
        readonly stopBtn: "Stop recording";
        readonly recordingState: "Recording in progress";
        readonly processingState: "Checking your pronunciation, please wait";
        readonly playback: "Play back your recording";
    };
    readonly errors: {
        readonly micDenied: "Microphone access is blocked. Enable it in your browser settings, or skip this exercise.";
        readonly unsupported: "Your browser doesn’t support voice recording. Try a different browser, or skip this exercise.";
        readonly timeout: "That took too long. Please try again.";
        readonly tooLarge: "Your recording is too long. Keep it short and try again.";
        readonly network: "You appear to be offline. Reconnect and try again.";
        readonly generic: "Something went wrong. Please try again.";
    };
};
