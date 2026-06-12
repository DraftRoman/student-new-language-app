export declare function saveSentenceResult(exerciseId: string, correct: boolean): Promise<void>;
export declare function saveWordResult(lemma: string, language: string, correct: boolean): Promise<void>;
export declare function getAllSentenceProgress(): Promise<Record<string, {
    correct: number;
    attempts: number;
    updated_at: string;
}>>;
