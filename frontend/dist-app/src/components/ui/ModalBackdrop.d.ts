import type { ReactNode } from "react";
interface ModalBackdropProps {
    onClose: () => void;
    children: ReactNode;
}
export default function ModalBackdrop({ onClose, children }: ModalBackdropProps): import("react/jsx-runtime").JSX.Element;
export {};
