import { jsxs as _jsxs } from "react/jsx-runtime";
export default function Alert({ type, message }) {
    const isError = type === "error";
    return (_jsxs("div", { className: `rounded-[12px] px-4 py-[10px] text-sm ${isError
            ? "bg-[var(--state-wrong-bg)] border border-[var(--state-wrong-bd)] text-[var(--state-wrong)]"
            : "bg-[var(--state-correct-bg)] border border-[var(--state-correct-bd)] text-[var(--state-correct)]"}`, children: [isError ? "⚠️" : "✅", " ", message] }));
}
