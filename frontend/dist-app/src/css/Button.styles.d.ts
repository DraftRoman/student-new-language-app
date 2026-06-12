export type Variant = "primary" | "dark" | "outline" | "ghost" | "white";
export type Size = "sm" | "md" | "lg";
export declare const variants: Record<Variant, string>;
export declare const sizes: Record<Size, string>;
export declare const base = "font-semibold whitespace-nowrap cursor-pointer transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0";
