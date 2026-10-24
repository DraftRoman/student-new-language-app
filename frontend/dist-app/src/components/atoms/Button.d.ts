import { type Variant, type Size } from "../../css/Button.styles";
interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: Variant;
    size?: Size;
    disabled?: boolean;
    type?: "button" | "submit";
    className?: string;
    ariaLabel?: string;
}
export default function Button({ children, onClick, variant, size, disabled, type, className, ariaLabel, }: ButtonProps): import("react/jsx-runtime").JSX.Element;
export {};
