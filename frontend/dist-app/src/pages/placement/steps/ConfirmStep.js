import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { COPY } from "../copy";
export default function ConfirmStep({ recommended, allowedMax, busy, onConfirm }) {
    const overrideAvailable = allowedMax !== recommended;
    const [chosen, setChosen] = useState(recommended);
    const eyebrow = overrideAvailable ? COPY.confirm.eyebrowDefault : COPY.confirm.eyebrowCeiling;
    return (_jsxs("section", { className: "flex flex-col gap-6 max-w-[520px] mx-auto px-6 py-10", children: [_jsxs("header", { className: "text-center", children: [_jsx("p", { className: "text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--c-green)] mb-2", children: eyebrow }), _jsx("h1", { className: "text-[2rem] font-black text-[var(--text-primary)] m-0", children: COPY.confirm.title(recommended) }), _jsx("p", { className: "text-[var(--text-secondary)] mt-3 text-[0.95rem]", children: overrideAvailable
                            ? COPY.confirm.overrideAvailable(allowedMax)
                            : COPY.confirm.overrideDisabled })] }), _jsxs("div", { className: "flex flex-col gap-3", role: "radiogroup", "aria-label": "Pick your starting level", children: [_jsx("button", { type: "button", role: "radio", "aria-checked": chosen === recommended, onClick: () => setChosen(recommended), className: `text-left p-4 rounded-[16px] border-[1.5px] cursor-pointer transition-all ${chosen === recommended
                            ? "bg-[var(--c-green-tint-md)] border-[var(--c-green)] text-[var(--text-primary)]"
                            : "bg-[var(--bg-surface)] border-[var(--border-medium)] text-[var(--text-primary)] hover:border-[var(--border-strong, var(--border-medium))]"}`, children: _jsx("div", { className: "font-bold text-[1rem]", children: COPY.confirm.chooseRecommended(recommended) }) }), overrideAvailable && (_jsx("button", { type: "button", role: "radio", "aria-checked": chosen === allowedMax, onClick: () => setChosen(allowedMax), className: `text-left p-4 rounded-[16px] border-[1.5px] cursor-pointer transition-all ${chosen === allowedMax
                            ? "bg-[var(--c-purple-tint)] border-[var(--c-purple-muted)] text-[var(--text-primary)]"
                            : "bg-[var(--bg-surface)] border-[var(--border-medium)] text-[var(--text-primary)] hover:border-[var(--border-strong, var(--border-medium))]"}`, children: _jsx("div", { className: "font-bold text-[1rem]", children: COPY.confirm.chooseOverride(allowedMax) }) }))] }), _jsx("button", { type: "button", onClick: () => onConfirm(chosen), disabled: busy, className: "w-full py-[16px] rounded-[16px] border-none cursor-pointer text-base font-bold bg-[var(--grad-purple-green)] text-white shadow-[var(--shadow-btn-primary)] disabled:opacity-60 disabled:cursor-not-allowed enabled:hover:-translate-y-[2px] transition-transform duration-200", children: busy ? COPY.confirm.confirming : COPY.confirm.confirmCta })] }));
}
