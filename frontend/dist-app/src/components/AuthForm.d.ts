interface AuthFormProps {
    onPasswordFocus?: () => void;
    onPasswordBlur?: () => void;
    onPasswordTyping?: () => void;
    onSuccess?: () => void;
    onError?: () => void;
    onTyping?: () => void;
}
export default function AuthForm({ onPasswordFocus, onPasswordBlur, onPasswordTyping, onSuccess, onError, onTyping }?: AuthFormProps): import("react/jsx-runtime").JSX.Element;
export {};
