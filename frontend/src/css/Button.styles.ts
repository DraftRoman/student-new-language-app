export type Variant = "primary" | "dark" | "outline" | "ghost" | "white";
export type Size    = "sm" | "md" | "lg";

export const variants: Record<Variant, string> = {
  primary: "bg-[var(--grad-btn-primary)] text-white shadow-[var(--shadow-btn-primary)] hover:shadow-[var(--shadow-btn-primary-hover)] hover:-translate-y-1",
  dark:    "bg-[var(--bg-card)] border border-[var(--border-medium)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
  outline: "border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:border-[var(--border-medium)]",
  ghost:   "text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]",
  white:   "bg-[var(--card-btn-bg)] text-[var(--card-btn-text)] shadow-xl hover:shadow-2xl hover:-translate-y-1",
};

export const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm rounded-full",
  md: "px-8 py-[14px] text-base rounded-2xl",
  lg: "px-10 py-4 text-lg rounded-2xl",
};

export const base = "font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0";
