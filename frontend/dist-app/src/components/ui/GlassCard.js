import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export default function GlassCard({ children, className = "", accentLine = true, onClick }) {
    return (_jsxs("div", { className: `relative z-[1] bg-[var(--bg-card)] backdrop-blur-[24px] border border-[var(--border-light)] rounded-[28px] shadow-[var(--glass-shadow)] ${className}`, onClick: onClick, children: [accentLine && (_jsx("div", { className: "absolute top-0 left-[10%] right-[10%] h-[2px] rounded-sm bg-[var(--grad-nav-accent)] opacity-80" })), children] }));
}
