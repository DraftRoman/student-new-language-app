import type { CefrLevel, VocabItem } from "../../../lib/placementService";
interface Props {
    level: CefrLevel;
    items: VocabItem[];
    pageSize: number;
    onComplete: (answers: Record<string, string>) => void;
}
export default function VocabMatchStep({ level, items, pageSize, onComplete }: Props): import("react/jsx-runtime").JSX.Element;
export {};
