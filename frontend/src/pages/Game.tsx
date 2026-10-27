import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis";
import { getSpeechLang } from "../utils/getSpeechLang";
import { useAuth } from "../context/AuthContext";
import { saveWordResult } from "../lib/progressService";
import * as S from "../css/Game.styles";

type Pair      = { question: string; answer: string };
type ImageMode = "question" | "answer" | null;
type Language  = "en-es" | "en-ru" | "es-ru" | "en-image" | "es-image" | "image-en" | "image-es";
type BtnState  = "idle" | "selected" | "correct" | "wrong";

const LANGUAGES: { value: Language; label: string }[] = [
  { value: "en-es",    label: "English → Spanish" },
  { value: "en-ru",    label: "English → Russian" },
  { value: "es-ru",    label: "Spanish → Russian" },
  { value: "en-image", label: "English → Image"   },
  { value: "es-image", label: "Spanish → Image"   },
  { value: "image-en", label: "Image → English"   },
  { value: "image-es", label: "Image → Spanish"   },
];

const TOTAL_PAIRS   = 5;
const TOTAL_SCREENS = 5;
// Ask for more words than one screen needs so each screen can skip words
// already shown earlier in the same game (the API caps limit at 20).
const FETCH_LIMIT   = 20;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchPairs(language: Language): Promise<{ pairs: Pair[]; imageMode: ImageMode }> {
  const res  = await fetch(`/api/game/wordmatch?language=${language}&limit=${FETCH_LIMIT}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to load words");
  return { pairs: data.pairs as Pair[], imageMode: data.imageMode as ImageMode };
}

// ── Image answer card ──────────────────────────────────────────────────────────
function ImageCard({ url, state }: { url: string; state: BtnState }) {
  return (
    <img
      src={url}
      alt="word"
      draggable={false}
      className={`w-full h-full object-contain rounded-[10px] pointer-events-none select-none transition-transform duration-300 ease-out ${state === "correct" ? "opacity-[0.45]" : "opacity-100"}`}
    />
  );
}

export default function Game() {
  const { speak } = useSpeechSynthesis();
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [language,     setLanguage]     = useState<Language>("en-es");
  const [imageMode,    setImageMode]    = useState<ImageMode>(null);
  const [pairs,        setPairs]        = useState<Pair[]>([]);
  const [answers,      setAnswers]      = useState<Pair[]>([]);
  const [score,        setScore]        = useState(0);
  const [matchedPairs, setMatchedPairs] = useState(0);
  const [selectedQ,    setSelectedQ]    = useState<number | null>(null);
  const [selectedA,    setSelectedA]    = useState<number | null>(null);
  const [qStates,      setQStates]      = useState<BtnState[]>(Array(TOTAL_PAIRS).fill("idle"));
  const [aStates,      setAStates]      = useState<BtnState[]>(Array(TOTAL_PAIRS).fill("idle"));
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [screen,       setScreen]       = useState(0);
  const [mistakes,     setMistakes]     = useState(0);
  const [finished,     setFinished]     = useState(false);
  // Questions already shown in this game, so later screens show new words.
  const usedQuestions = useRef<Set<string>>(new Set());

  const startRound = useCallback(async (lang: Language, resetScore = false) => {
    setLoading(true);
    setError(null);
    // Clear the finished screen right away so the "screen complete" timer
    // can't fire twice while the next words load.
    setPairs([]);
    setMatchedPairs(0);
    if (resetScore) {
      usedQuestions.current = new Set();
      setScreen(0);
      setMistakes(0);
      setFinished(false);
    }
    try {
      const { pairs: fetched, imageMode: mode } = await fetchPairs(lang);
      const fresh = fetched.filter(p => !usedQuestions.current.has(p.question));
      // Top up with repeats only if the dictionary has run out of new words.
      const newPairs = [...fresh, ...fetched.filter(p => usedQuestions.current.has(p.question))]
        .slice(0, TOTAL_PAIRS);
      newPairs.forEach(p => usedQuestions.current.add(p.question));
      setPairs(newPairs);
      setAnswers(shuffle(newPairs));
      setImageMode(mode);
      setSelectedQ(null);
      setSelectedA(null);
      setMatchedPairs(0);
      setQStates(Array(TOTAL_PAIRS).fill("idle"));
      setAStates(Array(TOTAL_PAIRS).fill("idle"));
      if (resetScore) setScore(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load words");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { startRound(language, true); }, [language, startRound]);

  useEffect(() => {
    if (pairs.length > 0 && matchedPairs === pairs.length) {
      const t = setTimeout(() => {
        if (screen + 1 >= TOTAL_SCREENS) {
          setFinished(true);
        } else {
          setScreen(s => s + 1);
          startRound(language);
        }
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [matchedPairs, pairs.length, screen, language, startRound]);

  const accuracy = score + mistakes > 0 ? Math.round((score / (score + mistakes)) * 100) : 0;

  const questionsAreImages = imageMode === "question";
  const answersAreImages   = imageMode === "answer";

  // ── shared match check ────────────────────────────────────────
  const checkMatch = (qIdx: number, aIdx: number) => {
    if (pairs[qIdx].answer === answers[aIdx].answer) {
      if (!answersAreImages) speak(answers[aIdx].answer, getSpeechLang(language, false));
      setQStates(prev => prev.map((s, idx) => idx === qIdx  ? "correct" : s));
      setAStates(prev => prev.map((s, idx) => idx === aIdx  ? "correct" : s));
      setScore(s => s + 1);
      setMatchedPairs(m => m + 1);
      const lemma = questionsAreImages ? answers[aIdx].answer : pairs[qIdx].question;
      if (user) saveWordResult(lemma, language, true).catch(() => {});
    } else {
      const lemma = questionsAreImages ? pairs[qIdx].question : pairs[qIdx].question;
      if (user) saveWordResult(lemma, language, false).catch(() => {});
      setMistakes(m => m + 1);
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

  const handleQuestion = (i: number) => {
    if (qStates[i] === "correct") return;
    if (!questionsAreImages) speak(pairs[i].question, getSpeechLang(language, true));

    // If an answer is already selected → check match immediately
    if (selectedA !== null) {
      checkMatch(i, selectedA);
      return;
    }
    // Otherwise select this question
    setSelectedQ(i);
    setSelectedA(null);
    setQStates(prev => prev.map((s, idx) => s === "correct" ? s : idx === i ? "selected" : "idle"));
    setAStates(prev => prev.map(s => s === "correct" ? s : "idle"));
  };

  const handleAnswer = (i: number) => {
    if (aStates[i] === "correct") return;
    if (!answersAreImages) speak(answers[i].answer, getSpeechLang(language, false));

    if (selectedQ !== null) {
      checkMatch(selectedQ, i);
      return;
    }
    // Otherwise select this answer
    setSelectedA(i);
    setSelectedQ(null);
    setAStates(prev => prev.map((s, idx) => s === "correct" ? s : idx === i ? "selected" : "idle"));
    setQStates(prev => prev.map(s => s === "correct" ? s : "idle"));
  };

  return (
    <div className={S.page}>

      <header className={S.header}>
        <div className="flex items-center justify-center mb-4">
          <h2 className={S.title}>Word Match</h2>
        </div>
        <div className={S.score}>🏆 Score: {score}</div>
        {!finished && (
          <p className={S.screenCounter}>Screen {screen + 1} / {TOTAL_SCREENS}</p>
        )}
        <select
          className={S.select}
          value={language}
          onChange={e => setLanguage(e.target.value as Language)}
        >
          {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
      </header>

      {finished ? (
        <div className={S.summary}>
          <div className="text-[48px]">{accuracy >= 80 ? "🏆" : accuracy >= 50 ? "🎉" : "💪"}</div>
          <h3 className={S.summaryTitle}>Well done!</h3>
          <p className={S.summaryText}>
            You matched <b>{score}</b> words with <b>{mistakes}</b> {mistakes === 1 ? "mistake" : "mistakes"}.
          </p>
          <p className={S.summaryAccuracy}>Accuracy: {accuracy}%</p>
          <div className={S.summaryButtons}>
            <button className={S.summaryBtnSecondary} onClick={() => startRound(language, true)}>
              🔄 Start over
            </button>
            <button className={S.summaryBtnPrimary} onClick={() => navigate("/sentence-builder")}>
              🧩 Go to sentences
            </button>
          </div>
        </div>
      ) : loading ? (
        <div className={S.spinner}>
          <div className={S.ring} />
          <p>Loading words…</p>
        </div>
      ) : error ? (
        <div className={S.errorBox}>
          <div className="text-[40px]">😕</div>
          <p className="text-[var(--text-secondary)] text-sm">{error}</p>
          <button className={S.errorRetry} onClick={() => startRound(language, true)}>
            Try again
          </button>
        </div>
      ) : (
        <>
          <div className={S.card}>

            <div className={S.column}>
              {pairs.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handleQuestion(i)}
                  disabled={qStates[i] === "correct"}
                  className={`${questionsAreImages ? S.btn.image : S.btn.base} ${qStates[i]}`}
                >
                  {questionsAreImages
                    ? <ImageCard url={p.question} state={qStates[i]} />
                    : p.question
                  }
                </button>
              ))}
            </div>

            {/* Answers — text or image */}
            <div className={S.column}>
              {answers.map((a, i) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(i)}
                  disabled={aStates[i] === "correct"}
                  className={`${answersAreImages ? S.btn.image : S.btn.base} ${aStates[i]}`}
                >
                  {answersAreImages
                    ? <ImageCard url={a.answer} state={aStates[i]} />
                    : a.answer
                  }
                </button>
              ))}
            </div>

          </div>

          {pairs.length > 0 && matchedPairs === pairs.length && (
            <div className={S.roundComplete}>
              <p className={S.roundText}>
                {screen + 1 >= TOTAL_SCREENS
                  ? "🎉 Last screen done! Counting your score…"
                  : "🎉 Screen complete! Next words loading…"}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
