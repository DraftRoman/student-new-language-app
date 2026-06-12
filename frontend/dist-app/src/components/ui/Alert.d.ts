interface AlertProps {
    type: "error" | "success";
    message: string;
}
export default function Alert({ type, message }: AlertProps): import("react/jsx-runtime").JSX.Element;
export {};
