import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect, useCallback } from "react";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { getSpeechLang } from "../utils/getSpeechLang";
import { useAuth } from "../context/AuthContext";
import { saveWordResult } from "../lib/progressService";
import * as S from "../css/Game.styles";
const LANGUAGES = [
    { value: "en-es", label: "English → Spanish" },
    { value: "en-ru", label: "English → Russian" },
    { value: "es-ru", label: "Spanish → Russian" },
    { value: "en-image", label: "English → Image" },
    { value: "es-image", label: "Spanish → Image" },
    { value: "image-en", label: "Image → English" },
    { value: "image-es", label: "Image → Spanish" },
];
const TOTAL_PAIRS = 5;
function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
async function fetchPairs(language) {
    const res = await fetch(`/api/game/wordmatch?language=${language}&limit=${TOTAL_PAIRS}`);
    const data = await res.json();
    if (!res.ok)
        throw new Error(data.error ?? "Failed to load words");
    return { pairs: data.pairs, imageMode: data.imageMode };
}
// ── Image answer card ──────────────────────────────────────────────────────────
function ImageCard({ url, state }) {
    return (_jsx("img", { src: url, alt: "word", draggable: false, className: `w-full h-full object-contain rounded-[10px] pointer-events-none select-none transition-transform duration-300 ease-out ${state === "correct" ? "opacity-[0.45]" : "opacity-100"}` }));
}
export default function Game() {
    const { speak } = useSpeechSynthesis();
    const { user } = useAuth();
    const [language, setLanguage] = useState("en-es");
    const [imageMode, setImageMode] = useState(null);
    const [pairs, setPairs] = useState([]);
    const [answers, setAnswers] = useState([]);
    const [score, setScore] = useState(0);
    const [matchedPairs, setMatchedPairs] = useState(0);
    const [selectedQ, setSelectedQ] = useState(null);
    const [selectedA, setSelectedA] = useState(null);
    const [qStates, setQStates] = useState(Array(TOTAL_PAIRS).fill("idle"));
    const [aStates, setAStates] = useState(Array(TOTAL_PAIRS).fill("idle"));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const startRound = useCallback(async (lang, resetScore = false) => {
        setLoading(true);
        setError(null);
        try {
            const { pairs: newPairs, imageMode: mode } = await fetchPairs(lang);
            setPairs(newPairs);
            setAnswers(shuffle(newPairs));
            setImageMode(mode);
            setSelectedQ(null);
            setSelectedA(null);
            setMatchedPairs(0);
            setQStates(Array(TOTAL_PAIRS).fill("idle"));
            setAStates(Array(TOTAL_PAIRS).fill("idle"));
            if (resetScore)
                setScore(0);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : "Could not load words");
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { startRound(language, true); }, [language, startRound]);
    useEffect(() => {
        if (matchedPairs === TOTAL_PAIRS && TOTAL_PAIRS > 0) {
            const t = setTimeout(() => startRound(language), 1500);
            return () => clearTimeout(t);
        }
    }, [matchedPairs, language, startRound]);
    const questionsAreImages = imageMode === "question";
    const answersAreImages = imageMode === "answer";
    // ── shared match check ────────────────────────────────────────
    const checkMatch = (qIdx, aIdx) => {
        if (pairs[qIdx].answer === answers[aIdx].answer) {
            if (!answersAreImages)
                speak(answers[aIdx].answer, getSpeechLang(language, false));
            setQStates(prev => prev.map((s, idx) => idx === qIdx ? "correct" : s));
            setAStates(prev => prev.map((s, idx) => idx === aIdx ? "correct" : s));
            setScore(s => s + 1);
            setMatchedPairs(m => m + 1);
            const lemma = questionsAreImages ? answers[aIdx].answer : pairs[qIdx].question;
            if (user)
                saveWordResult(lemma, language, true).catch(() => { });
        }
        else {
            const lemma = questionsAreImages ? pairs[qIdx].question : pairs[qIdx].question;
            if (user)
                saveWordResult(lemma, language, false).catch(() => { });
            // flash wrong on the second-clicked side
            setQStates(prev => prev.map((s, idx) => idx === qIdx && s !== "correct" ? "wrong" : s));
            setAStates(prev => prev.map((s, idx) => idx === aIdx && s !== "correct" ? "wrong" : s));
            setTimeout(() => {
                setQStates(prev => prev.map((s, idx) => idx === qIdx && s === "wrong" ? "idle" : s));
                setAStates(prev => prev.map((s, idx) => idx === aIdx && s === "wrong" ? "idle" : s));
            }, 500);
        }
        setSelectedQ(null);
        setSelectedA(null);
    };
    const handleQuestion = (i) => {
        if (qStates[i] === "correct")
            return;
        if (!questionsAreImages)
            speak(pairs[i].question, getSpeechLang(language, true));
        // If an answer is already selected → check match immediately
        if (selectedA !== null) {
            checkMatch(i, selectedA);
            return;
        }
        // Otherwise select this question
        setSelectedQ(i);
        setSelectedA(null);
        setQStates(prev => prev.map((s, idx) => s === "correct" ? s : idx === i ? "selected" : "idle"));
        setAStates(prev => prev.map((s, idx) => s === "correct" ? s : "idle"));
    };
    const handleAnswer = (i) => {
        if (aStates[i] === "correct")
            return;
        if (!answersAreImages)
            speak(answers[i].answer, getSpeechLang(language, false));
        if (selectedQ !== null) {
            checkMatch(selectedQ, i);
            return;
        }
        // Otherwise select this answer
        setSelectedA(i);
        setSelectedQ(null);
        setAStates(prev => prev.map((s, idx) => s === "correct" ? s : idx === i ? "selected" : "idle"));
        setQStates(prev => prev.map((s, idx) => s === "correct" ? s : "idle"));
    };
    return (_jsxs("div", { className: S.page, children: [_jsxs("header", { className: S.header, children: [_jsx("div", { className: "flex items-center justify-center mb-4", children: _jsx("h2", { className: S.title, children: "Word Match" }) }), _jsxs("div", { className: S.score, children: ["\uD83C\uDFC6 Score: ", score] }), _jsx("select", { className: S.select, value: language, onChange: e => setLanguage(e.target.value), children: LANGUAGES.map(l => _jsx("option", { value: l.value, children: l.label }, l.value)) })] }), loading ? (_jsxs("div", { className: S.spinner, children: [_jsx("div", { className: S.ring }), _jsx("p", { children: "Loading words\u2026" })] })) : error ? (_jsxs("div", { className: S.errorBox, children: [_jsx("div", { className: "text-[40px]", children: "\uD83D\uDE15" }), _jsx("p", { className: "text-[var(--text-secondary)] text-sm", children: error }), _jsx("button", { className: S.errorRetry, onClick: () => startRound(language, true), children: "Try again" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { className: S.card, children: [_jsx("div", { className: S.column, children: pairs.map((p, i) => (_jsx("button", { onClick: () => handleQuestion(i), disabled: qStates[i] === "correct", className: `${questionsAreImages ? S.btn.image : S.btn.base} ${qStates[i]}`, children: questionsAreImages
                                        ? _jsx(ImageCard, { url: p.question, state: qStates[i] })
                                        : p.question }, i))) }), _jsx("div", { className: S.column, children: answers.map((a, i) => (_jsx("button", { onClick: () => handleAnswer(i), disabled: aStates[i] === "correct", className: `${answersAreImages ? S.btn.image : S.btn.base} ${aStates[i]}`, children: answersAreImages
                                        ? _jsx(ImageCard, { url: a.answer, state: aStates[i] })
                                        : a.answer }, i))) })] }), matchedPairs === TOTAL_PAIRS && (_jsx("div", { className: S.roundComplete, children: _jsx("p", { className: S.roundText, children: "\uD83C\uDF89 Round complete! Next round loading\u2026" }) }))] }))] }));
}
