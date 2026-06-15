import { jsx as _jsx } from "react/jsx-runtime";
import { variants, sizes, base } from "../../css/Button.styles";
export default function Button({ children, onClick, variant = "primary", size = "md", disabled = false, type = "button", className = "", ariaLabel, }) {
    return (_jsx("button", { type: type, onClick: onClick, disabled: disabled, "aria-label": ariaLabel, className: `${base} ${variants[variant]} ${sizes[size]} ${className}`, children: children }));
}
