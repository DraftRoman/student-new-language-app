import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { saveSentenceResult } from "../lib/progressService";
import * as S from "../css/SentenceGame.styles";
function shuffle(arr) {
    return [...arr].sort(() => Math.random() - 0.5);
}
export default function SentenceGame() {
    const { user } = useAuth();
    const [sentences, setSentences] = useState([]);
    const [index, setIndex] = useState(0);
    const [bank, setBank] = useState([]);
    const [slots, setSlots] = useState([]);
    const [dragItem, setDragItem] = useState(null);
    const [result, setResult] = useState(null);
    const [showHint, setShowHint] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [transLang, setTransLang] = useState("es");
    const dragOver = useRef(null);
    useEffect(() => {
        fetch("/api/game/sentences")
            .then(r => r.json())
            .then(({ sentences, error: e }) => {
            if (e) {
                setError(e);
                return;
            }
            if (!sentences?.length) {
                setError("No sentences found.");
                return;
            }
            const shuffled = shuffle(sentences);
            setSentences(shuffled);
            loadSentence(shuffled, 0);
        })
            .catch(() => setError("Cannot reach the server. Is it running?"))
            .finally(() => setLoading(false));
    }, []);
    function loadSentence(list, i) {
        const s = list[i];
        if (!s)
            return;
        const words = s.words.map((w, idx) => ({ ...w, uid: `${w.form}-${idx}` }));
        setBank(shuffle(words));
        setSlots(Array(words.length).fill(null));
        setResult(null);
        setShowHint(false);
        setIndex(i);
    }
    function onDragStartBank(word) { setDragItem({ word, from: "bank" }); }
    function onDragStartSlot(word, slotIdx) { setDragItem({ word, from: slotIdx }); }
    function onDrop(target) {
        if (!dragItem)
            return;
        const newSlots = [...slots];
        const newBank = [...bank];
        const existing = typeof target === "number" ? newSlots[target] : null;
        if (dragItem.from === "bank") {
            const bi = newBank.findIndex(w => w.uid === dragItem.word.uid);
            if (bi !== -1)
                newBank.splice(bi, 1);
        }
        else {
            newSlots[dragItem.from] = null;
        }
        if (typeof target === "number") {
            newSlots[target] = dragItem.word;
            if (existing)
                newBank.push(existing);
        }
        else {
            newBank.push(dragItem.word);
        }
        setSlots(newSlots);
        setBank(newBank);
        setDragItem(null);
        dragOver.current = null;
    }
    function checkAnswer() {
        if (slots.some(s => s === null))
            return;
        const correct = slots.every((part, idx) => part?.position === idx);
        setResult(correct ? "correct" : "wrong");
        setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
        if (user)
            saveSentenceResult(sentences[index].id, correct).catch(() => { });
    }
    function tryAgain() {
        const s = sentences[index];
        if (!s)
            return;
        const words = s.words.map((w, idx) => ({ ...w, uid: `${w.form}-${idx}` }));
        setBank(shuffle(words));
        setSlots(Array(words.length).fill(null));
        setResult(null);
        setShowHint(false);
    }
    function next() {
        const nextIdx = index + 1;
        if (nextIdx < sentences.length) {
            loadSentence(sentences, nextIdx);
        }
        else {
            const reshuffled = shuffle(sentences);
            setSentences(reshuffled);
            loadSentence(reshuffled, 0);
        }
    }
    const current = sentences[index];
    const allPlaced = bank.length === 0;
    const firstWord = current?.words.find(w => w.position === 0)?.form ?? "";
    const translationText = current?.translation?.[transLang] ?? current?.translation?.es ?? "";
    if (loading)
        return (_jsx("div", { className: S.loadingScreen, children: _jsx("div", { className: S.loadingRing }) }));
    if (error)
        return (_jsxs("div", { className: S.errorScreen, children: [_jsx("div", { className: "text-[40px]", children: "\uD83D\uDE15" }), _jsx("div", { className: S.errorText, children: error })] }));
    return (_jsx("div", { className: S.page, children: _jsxs("main", { className: S.main, children: [_jsxs("div", { className: S.header, children: [_jsxs("div", { children: [_jsx("h1", { className: S.title, children: "Sentence Builder" }), _jsx("p", { className: S.subtitle, children: "Translate the sentence into English" })] }), _jsxs("div", { className: S.scoreBox, children: [_jsxs("div", { className: S.scoreNumber, children: [score.correct, "/", score.total] }), _jsx("div", { className: S.scoreLabel, children: "Score" })] })] }), _jsx("div", { className: S.legendRow, children: S.LEGEND.map(l => {
                        const st = S.getTokenStyle(l.type);
                        return (_jsxs("div", { className: S.legendPill, style: { background: st.bg, border: `1.5px solid ${st.border}`, color: st.text }, children: [_jsx("span", { className: S.legendDot, style: { background: st.text } }), l.label] }, l.type));
                    }) }), _jsxs("div", { className: S.card, children: [_jsxs("div", { className: S.progressRow, children: [_jsx("div", { className: S.progressTrack, children: _jsx("div", { className: `${S.progressFill} bg-[var(--grad-progress)]`, style: { width: `${((index + 1) / sentences.length) * 100}%` } }) }), _jsxs("span", { className: S.progressLabel, children: [index + 1, " / ", sentences.length] })] }), current && (_jsxs("div", { className: S.promptBox, children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("p", { className: `${S.promptEyebrow} m-0`, children: "Translate into English" }), _jsx("div", { className: "flex gap-[6px]", children: ["es", "ru"].map(lang => (_jsx("button", { onClick: () => setTransLang(lang), className: `text-[11px] font-bold py-[2px] px-[10px] rounded-[20px] border-[1.5px] cursor-pointer transition-all ${transLang === lang
                                                    ? "border-[var(--c-purple-muted)] bg-[var(--c-purple-tint)] text-[var(--c-purple)]"
                                                    : "border-[var(--border-medium)] bg-transparent text-[var(--text-secondary)]"}`, children: lang.toUpperCase() }, lang))) })] }), _jsx("p", { className: S.promptText, children: translationText || "—" })] })), _jsxs("div", { className: S.slotsArea, children: [_jsx("p", { className: S.sectionLabel, children: "Build the sentence" }), _jsx("div", { className: "min-h-[80px] rounded-[16px] p-3 flex flex-wrap gap-2 items-center transition-[border-color] duration-150", style: { border: S.dropZoneBorder(dragOver.current === "bank") }, onDragOver: e => { e.preventDefault(); dragOver.current = "bank"; }, onDrop: () => onDrop("bank"), children: slots.map((word, idx) => {
                                        const st = word ? S.getTokenStyle(word.word_type) : null;
                                        return (_jsx("div", { className: S.slot, style: {
                                                ...S.slotBorderStyle(st ? st.border : null, dragOver.current === idx),
                                                background: st ? st.bg : "var(--bg-surface)",
                                                cursor: word ? "grab" : "default",
                                            }, draggable: !!word, onDragStart: () => word && onDragStartSlot(word, idx), onDragOver: e => { e.preventDefault(); e.stopPropagation(); dragOver.current = idx; }, onDrop: e => { e.stopPropagation(); onDrop(idx); }, children: word ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "font-bold text-[15px]", style: { color: st.text }, children: word.form }), st.label && _jsx("span", { className: "text-[9px] opacity-70 font-semibold", style: { color: st.text }, children: st.label })] })) : (_jsx("span", { className: S.slotEmpty, children: "_" })) }, idx));
                                    }) })] }), _jsxs("div", { className: S.bankArea, children: [_jsx("p", { className: S.sectionLabel, children: "Word bank" }), _jsx("div", { className: S.bankPool, children: bank.length === 0 ? (_jsx("span", { className: S.bankEmpty, children: "All words placed \u2713" })) : bank.map(word => {
                                        const st = S.getTokenStyle(word.word_type);
                                        return (_jsxs("div", { draggable: true, onDragStart: () => onDragStartBank(word), className: S.bankChip, style: { border: `2px solid ${st.border}`, background: st.bg }, children: [_jsx("span", { className: "font-bold text-[15px]", style: { color: st.text }, children: word.form }), st.label && _jsx("span", { className: "text-[9px] opacity-70 font-semibold", style: { color: st.text }, children: st.label })] }, word.uid));
                                    }) })] }), result && (_jsxs("div", { className: `px-5 py-[14px] rounded-[14px] mb-5 font-bold text-[15px] flex items-center gap-[10px] border-[1.5px] ${result === "correct"
                                ? "bg-[var(--state-correct-bg)] border-[var(--state-correct-bd)] text-[var(--state-correct)]"
                                : "bg-[var(--state-wrong-bg)] border-[var(--state-wrong-bd)] text-[var(--state-wrong)]"}`, children: [result === "correct" ? "✅ Correct!" : "❌ Not quite — try again or skip", result === "correct" && current?.full_text && (_jsxs("span", { className: "font-normal text-[var(--text-secondary)] text-[13px]", children: ["\u2192 ", current.full_text] }))] })), showHint && (_jsxs("div", { className: S.hintBox, children: ["\uD83D\uDCA1 The sentence starts with: ", _jsxs("span", { className: "font-bold", children: ["\"", firstWord, "\""] })] }))] }), _jsx("div", { className: S.actionsRow, children: result === "wrong" ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: tryAgain, className: `${S.btnCheckBase} cursor-pointer bg-[var(--grad-btn-danger)] text-white`, children: "\uD83D\uDD04 Try again" }), _jsx("button", { onClick: next, className: S.btnSecondary, children: "Skip \u2192" })] })) : result === "correct" ? (_jsx("button", { onClick: next, className: `${S.btnCheckBase} cursor-pointer bg-[var(--grad-green-blue)] text-white`, children: "Next \u2192" })) : (_jsxs(_Fragment, { children: [_jsx("button", { onClick: checkAnswer, disabled: !allPlaced, className: `${S.btnCheckBase} ${allPlaced
                                    ? "cursor-pointer bg-[var(--grad-purple-green)] text-white"
                                    : "cursor-not-allowed bg-[var(--bg-surface)] text-[var(--text-tertiary)]"}`, children: "Check answer" }), _jsx("button", { onClick: () => setShowHint(h => !h), className: S.btnSecondary, children: "\uD83D\uDCA1 Hint" }), _jsx("button", { onClick: next, className: S.btnSecondary, children: "Skip \u2192" })] })) }), _jsx("div", { className: S.dotsRow, children: sentences.map((_, i) => (_jsx("div", { onClick: () => loadSentence(sentences, i), className: `${S.dot} ${i === index ? "w-5 bg-[var(--c-purple)]" : "w-2 bg-[var(--border-medium)]"}` }, i))) })] }) }));
}
