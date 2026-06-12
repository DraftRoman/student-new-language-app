import type { ReactNode, ElementType, CSSProperties } from "react";

type GradientKey = "purple_green" | "purple_yellow_green" | "green_blue";

const gradClass: Record<GradientKey, string> = {
  purple_green:        "bg-[var(--grad-purple-green)] bg-clip-text text-transparent",
  purple_yellow_green: "bg-[var(--grad-3color)] bg-clip-text text-transparent",
  green_blue:          "bg-[var(--grad-green-blue)] bg-clip-text text-transparent",
};

interface GradientTextProps {
  children:  ReactNode;
  as?:       ElementType;
  gradient?: GradientKey;
  className?: string;
  style?:    CSSProperties;
}

export default function GradientText({ children, as: Tag = "span", gradient = "purple_yellow_green", className = "", style }: GradientTextProps) {
  return (
    <Tag className={`${gradClass[gradient]} ${className}`} style={style}>
      {children}
    </Tag>
  );
}
