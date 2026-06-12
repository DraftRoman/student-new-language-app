import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
const IMG = {
    idle: "/turtle.png",
    covering: "/turtle2.png",
    happy: "/turtle.png",
    wondered: "/wondered-turtle.png",
};
export default function TurtlePeek({ state }) {
    return (_jsxs("div", { className: "relative w-[110px] h-[110px]", children: [_jsx("img", { src: IMG[state], alt: "turtle", className: `turtle-img ${state}` }), state === "happy" && (_jsxs(_Fragment, { children: [_jsx("div", { className: "absolute top-[-8px] left-[-4px] text-[1.1rem] pointer-events-none", style: { animation: "turtle-happy 0.7s ease-in-out 0.55s 3", animationDelay: "0.1s" }, children: "\u2728" }), _jsx("div", { className: "absolute top-[-8px] right-[-4px] text-[1.1rem] pointer-events-none", style: { animation: "turtle-happy 0.7s ease-in-out 3", animationDelay: "0.3s" }, children: "\u2B50" })] })), state === "wondered" && (_jsx("div", { className: "absolute top-[-10px] right-[-8px] text-[1.2rem] pointer-events-none", style: { animation: "turtle-wondered 0.5s ease-out 0.1s both" }, children: "\u2753" }))] }));
}
