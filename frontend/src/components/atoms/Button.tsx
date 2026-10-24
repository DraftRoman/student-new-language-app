import { variants, sizes, base, type Variant, type Size } from "../../css/Button.styles";

interface ButtonProps {
  children:  React.ReactNode;
  onClick?:  () => void;
  variant?:  Variant;
  size?:     Size;
  disabled?: boolean;
  type?:     "button" | "submit";
  className?: string;
  ariaLabel?: string;
}

export default function Button({
  children,
  onClick,
  variant   = "primary",
  size      = "md",
  disabled  = false,
  type      = "button",
  className = "",
  ariaLabel,
}: ButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}
