import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useMemo, useState } from "react";
import { COPY } from "../copy";
/** Static seeded shuffle so re-renders don't reorder cards mid-interaction. */
function seededShuffle(arr, seed) {
    const a = [...arr];
    let s = seed || 1;
    for (let i = a.length - 1; i > 0; i--) {
        s = (s * 9301 + 49297) % 233280;
        const j = Math.floor((s / 233280) * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
const initialPage = (size) => ({
    matched: Object.fromEntries(Array.from({ length: size }, (_, i) => [i, null])),
    selectedQ: null,
    selectedA: null,
});
export default function VocabMatchStep({ level, items, pageSize, onComplete }) {
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    const [pageIdx, setPageIdx] = useState(0);
    const [answers, setAnswers] = useState({});
    const [pageState, setPageState] = useState(() => initialPage(pageSize));
    const pageItems = useMemo(() => items.slice(pageIdx * pageSize, pageIdx * pageSize + pageSize), [items, pageIdx, pageSize]);
    // Shuffle the right column per page; seed by page so React re-renders
    // don't reshuffle as the user clicks.
    const shuffledAnswers = useMemo(() => seededShuffle(pageItems, pageIdx + 1), [pageItems, pageIdx]);
    const allMatched = pageItems.every((_, i) => pageState.matched[i] != null);
    const finishPage = () => {
        const next = { ...answers };
        pageItems.forEach((item, qIdx) => {
            const aIdx = pageState.matched[qIdx];
            if (aIdx != null)
                next[item.id] = shuffledAnswers[aIdx].answer;
        });
        if (pageIdx + 1 >= totalPages) {
            onComplete(next);
            return;
        }
        setAnswers(next);
        setPageIdx(pageIdx + 1);
        setPageState(initialPage(pageSize));
    };
    const tryMatch = (qIdx, aIdx) => {
        // If user clicks an already-matched cell, ignore (no undo here — the
        // rule is "1 wrong = 1 error", so any commit is final per page).
        if (pageState.matched[qIdx] != null)
            return;
        if (Object.values(pageState.matched).includes(aIdx))
            return;
        setPageState({
            ...pageState,
            matched: { ...pageState.matched, [qIdx]: aIdx },
            selectedQ: null,
            selectedA: null,
        });
    };
    const handleQ = (qIdx) => {
        if (pageState.matched[qIdx] != null)
            return;
        if (pageState.selectedA != null) {
            tryMatch(qIdx, pageState.selectedA);
            return;
        }
        setPageState({ ...pageState, selectedQ: qIdx });
    };
    const handleA = (aIdx) => {
        if (Object.values(pageState.matched).includes(aIdx))
            return;
        if (pageState.selectedQ != null) {
            tryMatch(pageState.selectedQ, aIdx);
            return;
        }
        setPageState({ ...pageState, selectedA: aIdx });
    };
    const qState = (qIdx) => {
        if (pageState.matched[qIdx] != null)
            return "matched";
        if (pageState.selectedQ === qIdx)
            return "selected";
        return "idle";
    };
    const aState = (aIdx) => {
        if (Object.values(pageState.matched).includes(aIdx))
            return "matched";
        if (pageState.selectedA === aIdx)
            return "selected";
        return "idle";
    };
    const cellClass = (s) => {
        const base = "py-3 px-3 rounded-[14px] text-[0.95rem] font-semibold border-[1.5px] transition-all duration-150 text-left";
        if (s === "matched")
            return `${base} bg-[var(--state-correct-bg)] border-[var(--state-correct-bd)] text-[var(--state-correct)] opacity-70 cursor-default`;
        if (s === "selected")
            return `${base} bg-[var(--c-purple-tint)] border-[var(--c-purple-muted)] text-[var(--c-purple)] cursor-pointer`;
        return `${base} bg-[var(--bg-surface)] border-[var(--border-medium)] text-[var(--text-primary)] cursor-pointer hover:-translate-y-0.5`;
    };
    return (_jsxs("section", { className: "flex flex-col gap-5 max-w-[640px] mx-auto px-6 py-8", children: [_jsxs("header", { children: [_jsxs("p", { className: "text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--c-green)] mb-1", children: [COPY.test.eyebrow(level), " \u00B7 ", COPY.test.pageOf(pageIdx + 1, totalPages)] }), _jsx("h2", { className: "text-[1.4rem] font-black text-[var(--text-primary)] m-0", children: COPY.test.vocabHeading }), _jsx("p", { className: "text-[var(--text-secondary)] text-sm mt-1", children: COPY.test.vocabHelp })] }), _jsxs("div", { className: "grid grid-cols-2 gap-3", children: [_jsx("div", { className: "flex flex-col gap-2", children: pageItems.map((item, qIdx) => (_jsx("button", { type: "button", onClick: () => handleQ(qIdx), disabled: qState(qIdx) === "matched", className: cellClass(qState(qIdx)), "aria-pressed": qState(qIdx) === "selected", children: item.question }, item.id))) }), _jsx("div", { className: "flex flex-col gap-2", children: shuffledAnswers.map((item, aIdx) => (_jsx("button", { type: "button", onClick: () => handleA(aIdx), disabled: aState(aIdx) === "matched", className: cellClass(aState(aIdx)), "aria-pressed": aState(aIdx) === "selected", children: item.answer }, item.id))) })] }), _jsx("button", { type: "button", onClick: finishPage, disabled: !allMatched, className: "w-full py-[14px] rounded-[14px] border-none text-base font-bold bg-[var(--grad-purple-green)] text-white shadow-[var(--shadow-btn-primary)] disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-y-[2px] transition-transform duration-200", children: pageIdx + 1 >= totalPages ? COPY.test.submitLevel : COPY.test.nextPage })] }));
}
