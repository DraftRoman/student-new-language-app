import { jsx as _jsx } from "react/jsx-runtime";
const gradClass = {
    purple_green: "bg-[var(--grad-purple-green)] bg-clip-text text-transparent",
    purple_yellow_green: "bg-[var(--grad-3color)] bg-clip-text text-transparent",
    green_blue: "bg-[var(--grad-green-blue)] bg-clip-text text-transparent",
};
export default function GradientText({ children, as: Tag = "span", gradient = "purple_yellow_green", className = "", style }) {
    return (_jsx(Tag, { className: `${gradClass[gradient]} ${className}`, style: style, children: children }));
}
