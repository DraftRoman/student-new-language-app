import type { CefrLevel } from "../../../lib/placementService";
interface Props {
    recommended: CefrLevel;
    allowedMax: CefrLevel;
    busy: boolean;
    onConfirm: (chosen: CefrLevel) => void;
}
export default function ConfirmStep({ recommended, allowedMax, busy, onConfirm }: Props): import("react/jsx-runtime").JSX.Element;
export {};
