import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function Badge({ children, pulse = false }) {
    return (_jsxs("div", { className: "inline-flex items-center gap-2 bg-[var(--badge-bg)] border border-[var(--badge-bd)] rounded-full px-[18px] py-2 text-sm font-semibold text-[var(--badge-text)]", children: [pulse && (_jsx("span", { className: "animate-pulse w-2 h-2 rounded-full bg-[var(--badge-dot)] flex-shrink-0 inline-block" })), children] }));
}
