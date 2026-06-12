import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import Logo   from "../atoms/Logo";
import Avatar from "../atoms/Avatar";
import Button from "../atoms/Button";
import { Alert, GlassCard, GradientText, Input, ModalBackdrop } from "../ui";

interface AppNavbarProps {
  onSignIn?: () => void;
}

export default function AppNavbar({ onSignIn }: AppNavbarProps) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const isLanding = location.pathname === "/";

  const { user, logout, changePassword } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [visible, setVisible]   = useState(true);
  const lastScrollY              = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 10 || y < lastScrollY.current) setVisible(true);
      else setVisible(false);
      lastScrollY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [newPw,     setNewPw]     = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg,     setPwMsg]     = useState("");
  const [pwError,   setPwError]   = useState("");
  const [pwLoading, setPwLoading] = useState(false);

  const openPasswordModal = () => {
    setDropOpen(false);
    setNewPw(""); setConfirmPw(""); setPwMsg(""); setPwError("");
    setModalOpen(true);
  };

  const handleChangePassword = async () => {
    setPwMsg(""); setPwError("");
    if (newPw.length < 6)    { setPwError("Password must be at least 6 characters."); return; }
    if (newPw !== confirmPw) { setPwError("Passwords don't match."); return; }
    setPwLoading(true);
    try {
      await changePassword(newPw);
      setPwMsg("Password updated!");
      setTimeout(() => { setModalOpen(false); setPwMsg(""); }, 1800);
    } catch (err: any) {
      setPwError(err?.message || "Something went wrong.");
    } finally {
      setPwLoading(false);
    }
  };

  const handleSignOut = () => { logout(); navigate("/"); };

  const displayName  = user?.name  || user?.email || "";
  const displayEmail = user?.email || "";
  const initial      = displayName ? displayName[0].toUpperCase() : "?";

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-40 bg-[var(--nav-bg)] backdrop-blur-[12px] border-b border-[var(--nav-border)] px-6 py-3 min-h-[60px] flex items-center justify-center shadow-[var(--shadow-nav)] transition-transform duration-300 ${visible ? "translate-y-0" : "-translate-y-full"}`}>

        {!isLanding && (
          <div className="absolute left-6">
            <button
              onClick={() => location.pathname === "/dashboard" ? navigate("/") : navigate("/dashboard")}
              title={location.pathname === "/dashboard" ? "Back to home" : "Back to dashboard"}
              className="w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-medium)] cursor-pointer flex items-center justify-center text-sm text-[var(--text-secondary)]"
            >←</button>
          </div>
        )}

        <div className="text-[var(--text-primary)]">
          <Logo size="md" />
        </div>

        <div className="absolute right-6 flex items-center gap-3" ref={dropRef}>
          {/* ── Theme toggle ── */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className={`relative w-11 h-6 rounded-[12px] border-[1.5px] border-[var(--border-medium)] cursor-pointer flex-shrink-0 transition-[background,border-color] duration-300 ${
              theme === "light" ? "bg-[var(--c-green-demo)]" : "bg-[var(--bg-hover)]"
            }`}
          >
            <span className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow-[var(--shadow-toggle-knob)] flex items-center justify-center text-[9px] select-none transition-[left] duration-[250ms] ${
              theme === "dark" ? "left-[2px]" : "left-[20px]"
            }`}>
              {theme === "dark" ? "🌙" : "☀️"}
            </span>
          </button>
          {user ? (
            <>
              <span className="text-sm text-[var(--text-secondary)]">{displayName}</span>
              <button
                onClick={() => setDropOpen(o => !o)}
                className="bg-transparent border-none cursor-pointer rounded-full p-0"
              >
                <Avatar initial={initial} size="md" />
              </button>

              {dropOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-[220px] z-50 bg-[var(--dropdown-bg)] backdrop-blur-[20px] border border-[var(--border-light)] rounded-[18px] shadow-[var(--dropdown-shadow)] overflow-hidden">
                  <div className="h-[2px] opacity-70 bg-[var(--grad-nav-accent)]" />
                  <div className="px-4 py-[14px] border-b border-[var(--border-subtle)]">
                    <p className="text-sm font-bold text-[var(--text-primary)] m-0">{displayName || "User"}</p>
                    <p className="text-xs text-[var(--text-secondary)] mt-[3px] mb-0">{displayEmail}</p>
                  </div>
                  <div className="py-[6px]">
                    <button
                      onClick={openPasswordModal}
                      className="w-full text-left px-4 py-[11px] text-sm text-[var(--text-primary)] bg-none border-none cursor-pointer flex items-center gap-[10px] transition-all duration-[150ms] hover:bg-[var(--c-purple-focus)]"
                    >
                      🔑 Change password
                    </button>
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-[11px] text-sm text-[var(--text-primary)] bg-none border-none cursor-pointer flex items-center gap-[10px] transition-all duration-[150ms] hover:bg-[var(--c-red-tint)] hover:text-[var(--c-red)]"
                    >
                      🚪 Sign out
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Button variant="dark" size="sm" onClick={onSignIn}>Sign In →</Button>
          )}
        </div>
      </nav>

      {modalOpen && (
        <ModalBackdrop onClose={() => setModalOpen(false)}>
          <GlassCard className="w-full max-w-[400px] p-8 flex flex-col gap-5">

            <div className="flex items-start justify-between">
              <div>
                <GradientText as="h2" gradient="purple_yellow_green" className="text-[1.25rem] font-black m-0">
                  Change password
                </GradientText>
                <p className="text-sm text-[var(--text-secondary)] mt-1 mb-0">Choose a new secure password</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-light)] cursor-pointer flex items-center justify-center text-[13px] text-[var(--text-secondary)] flex-shrink-0 transition-all duration-200 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">✕</button>
            </div>

            <Input label="New password"     type="password" placeholder="Min. 6 characters"  value={newPw}     onChange={setNewPw}     />
            <Input label="Confirm password" type="password" placeholder="Repeat new password" value={confirmPw} onChange={setConfirmPw} onKeyDown={e => e.key === "Enter" && handleChangePassword()} />

            {pwError && <Alert type="error"   message={pwError} />}
            {pwMsg   && <Alert type="success" message={pwMsg}   />}

            <div className="flex gap-3">
              <button
                onClick={handleChangePassword}
                disabled={pwLoading}
                className="flex-1 px-6 py-[13px] text-[0.9rem] bg-[var(--grad-3color)] text-white font-extrabold border-none cursor-pointer rounded-[14px] shadow-[var(--shadow-purple)] flex items-center justify-center transition-[transform,opacity] duration-[250ms] tracking-[0.02em] hover:enabled:-translate-y-[2px] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {pwLoading ? "Saving…" : "Save password"}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-[13px] text-[0.9rem] bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] font-semibold cursor-pointer rounded-[14px] transition-all duration-200 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
            </div>
          </GlassCard>
        </ModalBackdrop>
      )}
    </>
  );
}
