import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Alert, Input } from "./ui";
export default function AuthForm({ onPasswordFocus, onPasswordBlur, onPasswordTyping, onSuccess, onError, onTyping } = {}) {
    const navigate = useNavigate();
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const handleSubmit = async () => {
        setError("");
        if (!email || !password) {
            setError("Please fill in all fields.");
            return;
        }
        if (!isLogin && !name.trim()) {
            setError("Please enter your name.");
            return;
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        setLoading(true);
        try {
            if (isLogin)
                await login(email, password);
            else
                await register(name, email, password);
            onSuccess?.();
            // New users land on the placement gate (story §4.1). Returning users
            // already have a level and go straight to their dashboard.
            const dest = isLogin ? "/dashboard" : "/onboarding/placement";
            setTimeout(() => navigate(dest), 900);
        }
        catch (err) {
            const msg = err?.message || "";
            if (msg.includes("Invalid credentials") || msg.includes("Invalid email or password")) {
                setError("Invalid email or password.");
            }
            else if (msg.includes("already")) {
                setError("This email is already registered.");
            }
            else {
                setError(msg || "Something went wrong. Try again.");
            }
            onError?.();
        }
        finally {
            setLoading(false);
        }
    };
    const onKey = (e) => { if (e.key === "Enter")
        handleSubmit(); };
    const switchMode = () => { setIsLogin(l => !l); setError(""); };
    const eyeBtn = (_jsx("button", { type: "button", tabIndex: -1, onClick: () => setShowPassword(p => !p), className: "bg-transparent border-none cursor-pointer text-base text-[var(--text-secondary)]", children: showPassword ? "🙈" : "👁️" }));
    return (_jsxs("div", { className: "flex flex-col gap-6", children: [_jsx("div", { className: "flex bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-1 gap-1", children: ["Sign In", "Register"].map((label, i) => {
                    const active = isLogin ? i === 0 : i === 1;
                    return (_jsx("button", { onClick: () => { setIsLogin(i === 0); setError(""); }, className: `flex-1 p-[10px] rounded-[10px] text-sm font-bold border-none cursor-pointer transition-all duration-[250ms] ${active
                            ? "bg-[var(--grad-purple-green)] text-white shadow-[var(--shadow-tab-active)]"
                            : "bg-transparent text-[var(--text-secondary)]"}`, children: label }, label));
                }) }), _jsxs("div", { className: "flex flex-col gap-5", children: [!isLogin && (_jsx(Input, { label: "Your name", placeholder: "Jane Doe", value: name, onChange: v => { setName(v); onTyping?.(); }, onKeyDown: onKey, autoComplete: "name" })), _jsx(Input, { label: "Email", type: "email", placeholder: "you@example.com", value: email, onChange: v => { setEmail(v); onTyping?.(); }, onKeyDown: onKey, autoComplete: "email" }), _jsx(Input, { label: "Password", type: showPassword ? "text" : "password", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", value: password, onChange: v => { setPassword(v); onPasswordTyping?.(); }, onKeyDown: onKey, onFocus: onPasswordFocus, onBlur: onPasswordBlur, autoComplete: isLogin ? "current-password" : "new-password", suffix: eyeBtn }), error && _jsx(Alert, { type: "error", message: error }), _jsx("button", { onClick: handleSubmit, disabled: loading, className: "w-full py-4 min-h-[52px] text-base bg-[var(--grad-3color)] text-white font-extrabold border-none cursor-pointer rounded-[14px] shadow-[var(--shadow-purple)] flex items-center justify-center transition-[transform,opacity] duration-[250ms] tracking-[0.02em] hover:enabled:-translate-y-[2px] disabled:opacity-70 disabled:cursor-not-allowed", children: loading ? _jsx("span", { className: "spinner-light" }) : isLogin ? "Sign In →" : "Create Account →" })] }), _jsxs("p", { className: "text-center text-sm text-[var(--text-tertiary)] m-0", children: [isLogin ? "No account yet? " : "Already have one? ", _jsx("span", { onClick: switchMode, className: "bg-[var(--grad-purple-green)] bg-clip-text text-transparent font-bold cursor-pointer", children: isLogin ? "Register here" : "Sign in" })] })] }));
}
