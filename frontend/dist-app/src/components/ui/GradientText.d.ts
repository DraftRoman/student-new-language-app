import type { ReactNode, ElementType, CSSProperties } from "react";
type GradientKey = "purple_green" | "purple_yellow_green" | "green_blue";
interface GradientTextProps {
    children: ReactNode;
    as?: ElementType;
    gradient?: GradientKey;
    className?: string;
    style?: CSSProperties;
}
export default function GradientText({ children, as: Tag, gradient, className, style }: GradientTextProps): import("react/jsx-runtime").JSX.Element;
export {};
