import { jsx as _jsx } from "react/jsx-runtime";
const sizes = {
    sm: "w-8 h-8 text-xs",
    md: "w-9 h-9 text-sm",
};
export default function Avatar({ initial, size = "md" }) {
    return (_jsx("div", { className: `${sizes[size]} rounded-full bg-[var(--grad-avatar)] flex items-center justify-center text-white font-bold shadow-sm`, children: initial }));
}
