import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Alert, Input } from "./ui";

interface AuthFormProps {
  onPasswordFocus?:  () => void;
  onPasswordBlur?:   () => void;
  onPasswordTyping?: () => void;
  onSuccess?:        () => void;
  onError?:          () => void;
  onTyping?:         () => void;
}

export default function AuthForm({ onPasswordFocus, onPasswordBlur, onPasswordTyping, onSuccess, onError, onTyping }: AuthFormProps = {}) {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [isLogin,       setIsLogin]       = useState(true);
  const [name,          setName]          = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [showPassword,  setShowPassword]  = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!email || !password)      { setError("Please fill in all fields."); return; }
    if (!isLogin && !name.trim()) { setError("Please enter your name."); return; }
    if (password.length < 6)      { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    try {
      if (isLogin) await login(email, password);
      else         await register(name, email, password);
      onSuccess?.();
      // New users land on the placement gate (story §4.1). Returning users
      // already have a level and go straight to their dashboard.
      const dest = isLogin ? "/dashboard" : "/onboarding/placement";
      setTimeout(() => navigate(dest), 900);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Invalid credentials") || msg.includes("Invalid email or password")) {
        setError("Invalid email or password.");
      } else if (msg.includes("already")) {
        setError("This email is already registered.");
      } else {
        setError(msg || "Something went wrong. Try again.");
      }
      onError?.();
    } finally {
      setLoading(false);
    }
  };

  const onKey      = (e: React.KeyboardEvent) => { if (e.key === "Enter") handleSubmit(); };
  const switchMode = () => { setIsLogin(l => !l); setError(""); };

  const eyeBtn = (
    <button
      type="button"
      tabIndex={-1}
      onClick={() => setShowPassword(p => !p)}
      className="bg-transparent border-none cursor-pointer text-base text-[var(--text-secondary)]"
    >
      {showPassword ? "🙈" : "👁️"}
    </button>
  );

  return (
    <div className="flex flex-col gap-6">

      {/* Tabs */}
      <div className="flex bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[14px] p-1 gap-1">
        {(["Sign In", "Register"] as const).map((label, i) => {
          const active = isLogin ? i === 0 : i === 1;
          return (
            <button
              key={label}
              onClick={() => { setIsLogin(i === 0); setError(""); }}
              className={`flex-1 p-[10px] rounded-[10px] text-sm font-bold border-none cursor-pointer transition-all duration-[250ms] ${
                active
                  ? "bg-[var(--grad-purple-green)] text-white shadow-[var(--shadow-tab-active)]"
                  : "bg-transparent text-[var(--text-secondary)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-5">
        {!isLogin && (
          <Input label="Your name" placeholder="Jane Doe" value={name} onChange={v => { setName(v); onTyping?.(); }} onKeyDown={onKey} autoComplete="name" />
        )}
        <Input label="Email" type="email" placeholder="you@example.com" value={email} onChange={v => { setEmail(v); onTyping?.(); }} onKeyDown={onKey} autoComplete="email" />
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          placeholder="••••••••"
          value={password}
          onChange={v => { setPassword(v); onPasswordTyping?.(); }}
          onKeyDown={onKey}
          onFocus={onPasswordFocus}
          onBlur={onPasswordBlur}
          autoComplete={isLogin ? "current-password" : "new-password"}
          suffix={eyeBtn}
        />

        {error && <Alert type="error" message={error} />}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 min-h-[52px] text-base bg-[var(--grad-3color)] text-white font-extrabold border-none cursor-pointer rounded-[14px] shadow-[var(--shadow-purple)] flex items-center justify-center transition-[transform,opacity] duration-[250ms] tracking-[0.02em] hover:enabled:-translate-y-[2px] disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {loading ? <span className="spinner-light" /> : isLogin ? "Sign In →" : "Create Account →"}
        </button>
      </div>

      <p className="text-center text-sm text-[var(--text-tertiary)] m-0">
        {isLogin ? "No account yet? " : "Already have one? "}
        <span
          onClick={switchMode}
          className="bg-[var(--grad-purple-green)] bg-clip-text text-transparent font-bold cursor-pointer"
        >
          {isLogin ? "Register here" : "Sign in"}
        </span>
      </p>

    </div>
  );
}
