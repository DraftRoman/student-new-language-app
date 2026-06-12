import type { ReactNode } from "react";

interface GlassCardProps {
  children:    ReactNode;
  className?:  string;
  accentLine?: boolean;
  onClick?:    (e: React.MouseEvent) => void;
}

export default function GlassCard({ children, className = "", accentLine = true, onClick }: GlassCardProps) {
  return (
    <div
      className={`relative z-[1] bg-[var(--bg-card)] backdrop-blur-[24px] border border-[var(--border-light)] rounded-[28px] shadow-[var(--glass-shadow)] ${className}`}
      onClick={onClick}
    >
      {accentLine && (
        <div className="absolute top-0 left-[10%] right-[10%] h-[2px] rounded-sm bg-[var(--grad-nav-accent)] opacity-80" />
      )}
      {children}
    </div>
  );
}
