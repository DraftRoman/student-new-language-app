import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../components/organisms/AuthModal";
// ── Feature card data ──────────────────────────────────────
const cards = [
    {
        icon: "⚡",
        bg: "var(--c-purple-tint)",
        title: "Match Words",
        desc: "5 pairs per round — pick the correct translation before time runs out. Fast and addictive.",
    },
    {
        icon: "🧩",
        bg: "var(--c-yellow-tint)",
        title: "Build Sentences",
        desc: "Drag coloured tiles into the right order. Every word is colour-coded by grammar role.",
    },
    {
        icon: "🌍",
        bg: "var(--c-green-tint)",
        title: "4 Languages",
        desc: "English ↔ Spanish, English ↔ Russian, Spanish ↔ Russian, and Español → Emojis.",
    },
    {
        icon: "🏆",
        bg: "var(--c-blue-tint)",
        title: "Track Progress",
        desc: "Your score is saved every session. Watch your accuracy grow over time.",
    },
];
// ── Word pairs shown in the 3D device mockup ──────────────
const mockPairs = [
    { q: "dog", a: "perro", qc: "var(--c-purple-demo)", ac: "var(--c-green-demo)" },
    { q: "house", a: "casa", qc: "var(--c-blue-demo-lo)", ac: "var(--c-yellow-demo-lo)" },
    { q: "water", a: "agua", qc: "var(--c-green-demo)", ac: "var(--c-purple-demo-lo)" },
    { q: "cat", a: "gato", qc: "var(--c-yellow-demo-lo)", ac: "var(--c-blue-demo-lo)" },
    { q: "book", a: "libro", qc: "var(--c-purple-demo-lo)", ac: "var(--c-green-demo-lo)" },
];
export default function Landing() {
    const { showAuth, setShowAuth } = useOutletContext();
    const navigate = useNavigate();
    const { user } = useAuth();
    const cardsRef = useRef([]);
    // ── IntersectionObserver → reveal cards ──────────────────
    useEffect(() => {
        const obs = new IntersectionObserver((entries) => entries.forEach(e => { if (e.isIntersecting)
            e.target.classList.add("visible"); }), { threshold: 0.15 });
        cardsRef.current.forEach(el => el && obs.observe(el));
        return () => obs.disconnect();
    }, []);
    return (_jsxs("div", { className: "bg-[var(--bg-base)] text-[var(--text-primary)] overflow-x-hidden font-sans", children: [_jsx("div", { className: "relative overflow-hidden min-h-screen", children: _jsxs("div", { className: "min-h-screen flex items-center relative pt-[130px] px-12 pb-20 overflow-hidden max-w-[1200px] mx-auto z-[3] max-sm:px-6", children: [_jsxs("div", { className: "relative z-10 max-w-[560px] flex flex-col gap-7", children: [_jsx("div", { className: "eyebrow-pill inline-flex items-center gap-2 bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-full px-4 py-[6px] text-xs font-bold uppercase tracking-[0.1em] text-[var(--c-green)] w-fit", children: "Free to use \u00B7 No credit card needed" }), _jsxs("h1", { className: "hero-title", children: ["Learn languages", _jsx("br", {}), _jsx("span", { className: "grad", children: "the fun way." })] }), _jsx("p", { className: "text-[1.1rem] text-[var(--text-secondary)] leading-[1.7] m-0 max-w-[400px]", children: "Match words, build sentences, track your score. Four languages. Zero fluff." }), _jsx("div", { className: "flex gap-[10px] flex-wrap", children: ["🇬🇧", "🇪🇸", "🇷🇺", "🌍"].map((f, i) => (_jsx("div", { className: "flag-icon w-11 h-11 rounded-full bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center justify-center text-[1.3rem]", children: f }, i))) }), _jsx("div", { className: "flex gap-3 flex-wrap", children: user ? (_jsx("button", { className: "py-[15px] px-[30px] rounded-[14px] border-none cursor-pointer text-base font-bold bg-[var(--grad-purple-green)] text-white transition-[opacity,transform] duration-200 tracking-[0.01em] hover:opacity-[0.88] hover:-translate-y-0.5", onClick: () => navigate("/dashboard"), children: "Go to Dashboard \u2192" })) : (_jsxs(_Fragment, { children: [_jsx("button", { className: "py-[15px] px-[30px] rounded-[14px] border-none cursor-pointer text-base font-bold bg-[var(--grad-purple-green)] text-white transition-[opacity,transform] duration-200 tracking-[0.01em] hover:opacity-[0.88] hover:-translate-y-0.5", onClick: () => setShowAuth(true), children: "Start for free \u2192" }), _jsx("button", { className: "py-[15px] px-[30px] rounded-[14px] border border-[var(--border-medium)] cursor-pointer text-base font-semibold bg-transparent text-[var(--text-primary)] transition-[background,transform] duration-200 hover:bg-[var(--bg-surface)] hover:-translate-y-0.5", onClick: () => setShowAuth(true), children: "Sign in" })] })) }), _jsx("div", { className: "flex gap-7 pt-5 border-t border-[var(--border-light)] max-sm:gap-[18px]", children: [["4", "Languages"], ["500+", "Vocabulary words"], ["Free", "Always"]].map(([v, l]) => (_jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "text-[1.65rem] font-black bg-[var(--grad-green-blue)] bg-clip-text text-transparent leading-none", children: v }), _jsx("span", { className: "text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)] mt-1", children: l })] }, l))) })] }), _jsx("div", { className: "absolute right-[-20px] top-1/2 -translate-y-1/2 w-[50%] max-w-[520px] z-[2] perspective-[1000px] max-sm:hidden", children: _jsx("div", { className: "device-tablet w-full pt-7 pr-7 pb-7 pl-[88px] bg-[var(--bg-card)] rounded-[26px] min-h-[340px]", children: _jsxs("div", { className: "relative z-[2] p-[18px_16px] flex flex-col gap-[14px]", children: [_jsxs("div", { className: "flex justify-between items-center mb-1", children: [_jsx("span", { className: "device-title", children: "TurtleTalk" }), _jsx("span", { className: "text-[0.65rem] text-[var(--text-secondary)] font-semibold", children: "\uD83C\uDFC6 Score: 4" })] }), _jsxs("div", { className: "flex gap-[10px]", children: [_jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-[0.6rem] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-bold mb-[6px]", children: "English" }), mockPairs.map(p => (_jsx("div", { className: "py-2 px-[6px] rounded-[9px] text-[0.68rem] font-semibold text-center text-white whitespace-nowrap overflow-hidden text-ellipsis mb-[7px] border-[1.5px] border-[var(--border-light)]", style: { background: p.qc }, children: p.q }, p.q)))] }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "text-[0.6rem] uppercase tracking-[0.08em] text-[var(--text-tertiary)] font-bold mb-[6px]", children: "Spanish" }), [...mockPairs].reverse().map(p => (_jsx("div", { className: "py-2 px-[6px] rounded-[9px] text-[0.68rem] font-semibold text-center text-white whitespace-nowrap overflow-hidden text-ellipsis mb-[7px] border-[1.5px] border-[var(--border-light)]", style: { background: p.ac }, children: p.a }, p.a)))] })] })] }) }) })] }) }), _jsx("section", { className: "py-24 bg-[var(--bg-base)]", children: _jsxs("div", { className: "max-w-[960px] mx-auto px-6", children: [_jsx("p", { className: "text-[0.72rem] font-bold uppercase tracking-[0.12em] text-[var(--c-green)] text-center m-0 mb-[10px]", children: "Why TurtleTalk" }), _jsxs("h2", { className: "section-title font-black text-center m-0 mb-[52px] leading-[1.2] text-[var(--text-primary)]", children: ["Everything you need", _jsx("br", {}), "to level up"] }), _jsx("div", { className: "grid grid-cols-2 gap-[22px] max-sm:grid-cols-1", children: cards.map((c, i) => (_jsx("div", { className: "reveal-card relative rounded-[20px] p-7 bg-[var(--overlay-glass)] backdrop-blur-[8px] overflow-hidden", ref: el => { cardsRef.current[i] = el; }, children: _jsxs("div", { className: "relative z-[1]", children: [_jsx("div", { className: "w-[46px] h-[46px] rounded-[12px] flex items-center justify-center text-[1.4rem] mb-[18px]", style: { background: c.bg }, children: c.icon }), _jsx("div", { className: "text-[1.1rem] font-extrabold mb-2 bg-[var(--grad-full)] bg-clip-text text-transparent", children: c.title }), _jsx("p", { className: "text-[0.88rem] text-[var(--text-secondary)] leading-[1.65] m-0", children: c.desc })] }) }, i))) })] }) }), _jsxs("section", { className: "py-24 bg-[var(--bg-base)] relative overflow-hidden", children: [_jsx("div", { className: "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-[50%] pointer-events-none bg-[var(--glow-cta)]" }), _jsxs("div", { className: "relative max-w-[640px] mx-auto px-6 text-center", children: [_jsxs("h2", { className: "cta-title font-black m-0 mb-[14px] text-[var(--text-primary)]", children: ["Start learning today.", _jsx("br", {}), "It's completely free."] }), _jsx("p", { className: "text-[var(--text-secondary)] m-0 mb-9 text-[1.05rem]", children: "Join learners already building their vocabulary every day." }), _jsx("button", { className: "py-[15px] px-[30px] rounded-[14px] border-none cursor-pointer text-base font-bold bg-[var(--grad-purple-green)] text-white transition-[opacity,transform] duration-200 tracking-[0.01em] hover:opacity-[0.88] hover:-translate-y-0.5", onClick: () => user ? navigate("/dashboard") : setShowAuth(true), children: user ? "Go to Dashboard →" : "Create free account →" })] })] }), showAuth && _jsx(AuthModal, { onClose: () => setShowAuth(false) })] }));
}
