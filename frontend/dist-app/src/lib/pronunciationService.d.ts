export type PronunciationStatus = 'excellent' | 'passed' | 'retry';
export type TaskType = 'word' | 'phrase' | 'sentence';
export interface PronunciationDetails {
    words_matched: number;
    missing: string[];
    extra: string[];
    order_score: number;
}
export interface PronunciationResult {
    recognized_text: string;
    match_pct: number;
    status: PronunciationStatus;
    details: PronunciationDetails;
    latency_ms: number;
}
export interface CheckParams {
    audio: Blob;
    exerciseId: string;
    expectedText: string;
    courseLang: string;
    taskType?: TaskType;
    attemptNo?: number;
}
export type PronunciationErrorKind = 'timeout' | 'too_large' | 'bad_request' | 'unauthorized' | 'network' | 'server';
export declare class PronunciationError extends Error {
    kind: PronunciationErrorKind;
    constructor(kind: PronunciationErrorKind, message: string);
}
export declare function checkPronunciation(params: CheckParams): Promise<PronunciationResult>;
