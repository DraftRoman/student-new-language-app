import type { ReactNode } from "react";
interface GlassCardProps {
    children: ReactNode;
    className?: string;
    accentLine?: boolean;
    onClick?: (e: React.MouseEvent) => void;
}
export default function GlassCard({ children, className, accentLine, onClick }: GlassCardProps): import("react/jsx-runtime").JSX.Element;
export {};
