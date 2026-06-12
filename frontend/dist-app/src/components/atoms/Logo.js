import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const sizes = {
    sm: { img: "w-10 h-10", text: "text-lg" },
    md: { img: "w-12 h-12", text: "text-xl" },
};
export default function Logo({ size = "md" }) {
    return (_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("img", { src: "/turtle.png", alt: "TurtleTalk logo", className: sizes[size].img }), _jsx("span", { className: `${sizes[size].text} font-extrabold tracking-tight text-current`, children: "TurtleTalk" })] }));
}
