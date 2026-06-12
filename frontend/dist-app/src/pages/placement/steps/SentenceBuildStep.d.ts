import type { CefrLevel, SentenceItem } from "../../../lib/placementService";
interface Props {
    level: CefrLevel;
    items: SentenceItem[];
    onComplete: (answers: Record<string, string[]>) => void;
}
/**
 * Click-to-place sentence ordering. The drag-and-drop variant ships in the
 * regular game (SentenceGame.tsx); for the placement test we prefer the
 * click pattern because §5.3 requires a non-drag fallback.
 */
export default function SentenceBuildStep({ level, items, onComplete }: Props): import("react/jsx-runtime").JSX.Element | null;
export {};
