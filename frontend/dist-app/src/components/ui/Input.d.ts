import type { KeyboardEvent, FocusEventHandler, ReactNode } from "react";
interface InputProps {
    label?: string;
    type?: "text" | "email" | "password";
    placeholder?: string;
    value: string;
    onChange: (v: string) => void;
    onKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void;
    onFocus?: FocusEventHandler<HTMLInputElement>;
    onBlur?: FocusEventHandler<HTMLInputElement>;
    autoComplete?: string;
    className?: string;
    suffix?: ReactNode;
}
export default function Input({ label, type, placeholder, value, onChange, onKeyDown, onFocus, onBlur, autoComplete, className, suffix, }: InputProps): import("react/jsx-runtime").JSX.Element;
export {};
