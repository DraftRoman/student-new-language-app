export type CefrLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export interface VocabItem {
    id: string;
    question: string;
    answer: string;
}
export interface SentenceItem {
    id: string;
    construction: "affirmative" | "interrogative" | "negative";
    elements: string[];
    correct_order: string[];
}
export interface LevelBlock {
    level: CefrLevel;
    vocab: VocabItem[];
    sentence: SentenceItem[];
    vocab_page_size: number;
    total_items: number;
}
export type PriorExperienceResponse = {
    test_required: false;
    level: CefrLevel;
} | {
    test_required: true;
    session_id: string;
    current_level: CefrLevel | null;
    block: LevelBlock | null;
};
export interface SubmitLevelResponse {
    level: CefrLevel;
    errors: number;
    passed: boolean;
    next_level: CefrLevel | null;
    recommended_level: CefrLevel | null;
}
export interface PlacementResult {
    recommended_level: CefrLevel;
    allowed_max_level: CefrLevel;
    confirmed_level: CefrLevel | null;
}
export interface SubmitLevelAnswers {
    vocab: Record<string, string>;
    sentence: Record<string, string[]>;
}
export declare function answerPriorExperience(studiedBefore: boolean): Promise<PriorExperienceResponse>;
export declare function getLevelBlock(sessionId: string, level: CefrLevel): Promise<LevelBlock>;
export declare function submitLevelAnswers(sessionId: string, level: CefrLevel, answers: SubmitLevelAnswers): Promise<SubmitLevelResponse>;
export declare function getResult(sessionId: string): Promise<PlacementResult>;
export declare function confirmLevel(sessionId: string, chosenLevel: CefrLevel): Promise<{
    confirmed_level: CefrLevel;
}>;
