import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { COPY } from "../copy";
/**
 * Click-to-place sentence ordering. The drag-and-drop variant ships in the
 * regular game (SentenceGame.tsx); for the placement test we prefer the
 * click pattern because §5.3 requires a non-drag fallback.
 */
export default function SentenceBuildStep({ level, items, onComplete }) {
    const [idx, setIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [placed, setPlaced] = useState([]);
    const current = items[idx];
    const bank = useMemo(() => {
        if (!current)
            return [];
        const remaining = [...current.elements];
        placed.forEach(p => {
            const i = remaining.indexOf(p);
            if (i !== -1)
                remaining.splice(i, 1);
        });
        return remaining;
    }, [current, placed]);
    if (!current)
        return null;
    const advance = () => {
        const next = { ...answers, [current.id]: placed };
        if (idx + 1 >= items.length) {
            onComplete(next);
            return;
        }
        setAnswers(next);
        setIdx(idx + 1);
        setPlaced([]);
    };
    const placeWord = (w) => setPlaced(p => [...p, w]);
    const removeWord = (i) => setPlaced(p => p.filter((_, ix) => ix !== i));
    const reset = () => setPlaced([]);
    const allPlaced = bank.length === 0;
    return (_jsxs("section", { className: "flex flex-col gap-5 max-w-[640px] mx-auto px-6 py-8", children: [_jsxs("header", { children: [_jsxs("p", { className: "text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--c-green)] mb-1", children: [COPY.test.eyebrow(level), " \u00B7 Sentence ", idx + 1, " / ", items.length] }), _jsx("h2", { className: "text-[1.4rem] font-black text-[var(--text-primary)] m-0", children: COPY.test.sentenceHeading }), _jsx("p", { className: "text-[var(--text-secondary)] text-sm mt-1", children: COPY.test.sentenceHelp })] }), _jsx("div", { role: "list", "aria-label": "Your sentence so far", className: "min-h-[64px] rounded-[16px] p-3 flex flex-wrap gap-2 items-center border-[1.5px] border-dashed border-[var(--border-medium)] bg-[var(--bg-surface)]", children: placed.length === 0 ? (_jsx("span", { className: "text-[var(--text-tertiary)] text-sm", children: "\u2026" })) : (placed.map((w, i) => (_jsx("button", { type: "button", onClick: () => removeWord(i), className: "py-2 px-3 rounded-[12px] border-[1.5px] border-[var(--c-purple-muted)] bg-[var(--c-purple-tint)] text-[var(--c-purple)] font-bold text-[0.9rem] cursor-pointer", "aria-label": `Remove ${w}`, children: w }, `${w}-${i}`)))) }), _jsx("div", { className: "flex flex-wrap gap-2", children: bank.map((w, i) => (_jsx("button", { type: "button", onClick: () => placeWord(w), className: "py-2 px-3 rounded-[12px] border-[1.5px] border-[var(--border-medium)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold text-[0.9rem] cursor-pointer hover:-translate-y-0.5 transition-transform", children: w }, `${w}-${i}`))) }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: reset, disabled: placed.length === 0, className: "py-3 px-5 rounded-[14px] border border-[var(--border-medium)] bg-transparent text-[var(--text-secondary)] text-sm font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed", children: COPY.test.resetSentence }), _jsx("button", { type: "button", onClick: advance, disabled: !allPlaced, className: "flex-1 py-3 px-5 rounded-[14px] border-none text-base font-bold bg-[var(--grad-purple-green)] text-white shadow-[var(--shadow-btn-primary)] disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-y-[2px] transition-transform duration-200", children: idx + 1 >= items.length ? COPY.test.submitLevel : COPY.test.nextPage })] })] }));
}
