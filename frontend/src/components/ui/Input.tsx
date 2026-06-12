import type { KeyboardEvent, FocusEventHandler, ReactNode } from "react";

interface InputProps {
  label?:        string;
  type?:         "text" | "email" | "password";
  placeholder?:  string;
  value:         string;
  onChange:      (v: string) => void;
  onKeyDown?:    (e: KeyboardEvent<HTMLInputElement>) => void;
  onFocus?:      FocusEventHandler<HTMLInputElement>;
  onBlur?:       FocusEventHandler<HTMLInputElement>;
  autoComplete?: string;
  className?:    string;
  suffix?:       ReactNode;
}

export default function Input({
  label, type = "text", placeholder, value, onChange,
  onKeyDown, onFocus, onBlur, autoComplete, className = "", suffix,
}: InputProps) {
  return (
    <div>
      {label && (
        <label className="block text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-[6px]">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onBlur={onBlur}
          autoComplete={autoComplete}
          className={`w-full bg-[var(--bg-hover)] border border-[var(--border-light)] rounded-[12px] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-all duration-200 focus:border-[var(--c-purple-muted)] focus:shadow-[0_0_0_3px_var(--c-purple-focus)] placeholder:text-[var(--text-tertiary)] ${suffix ? "pr-12" : ""} ${className}`}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {suffix}
          </div>
        )}
      </div>
    </div>
  );
}
