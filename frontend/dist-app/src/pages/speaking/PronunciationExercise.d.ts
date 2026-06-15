import { type TaskType } from '../../lib/pronunciationService';
export interface PronunciationExerciseProps {
    exerciseId: string;
    expectedText: string;
    courseLang: string;
    taskType?: TaskType;
    maxDurationMs?: number;
    onSkip?: () => void;
}
export default function PronunciationExercise({ exerciseId, expectedText, courseLang, taskType, maxDurationMs, onSkip, }: PronunciationExerciseProps): import("react/jsx-runtime").JSX.Element;
