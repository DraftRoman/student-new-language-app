export type RecorderStatus = 'idle' | 'unsupported' | 'requesting' | 'denied' | 'recording' | 'recorded';
export interface AudioRecorder {
    status: RecorderStatus;
    blob: Blob | null;
    url: string | null;
    mimeType: string | null;
    durationMs: number;
    start: () => Promise<void>;
    stop: () => void;
    reset: () => void;
}
export declare function useAudioRecorder(maxDurationMs?: number): AudioRecorder;
