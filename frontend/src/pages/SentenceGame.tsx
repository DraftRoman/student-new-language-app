import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { saveSentenceResult } from "../lib/progressService";
import * as S from "../css/SentenceGame.styles";

interface Word {
  form:      string;
  word_type: string;
  position:  number;
  uid:       string;
}

interface Sentence {
  id:          string;
  full_text:   string;
  translation: { es?: string; ru?: string };
  words:       Word[];
  level:       string;
}

type TransLang = "es" | "ru";

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function SentenceGame() {
  const { user } = useAuth();

  const [sentences,   setSentences]   = useState<Sentence[]>([]);
  const [index,       setIndex]       = useState(0);
  const [bank,        setBank]        = useState<Word[]>([]);
  const [slots,       setSlots]       = useState<(Word | null)[]>([]);
  const [dragItem,    setDragItem]    = useState<{ word: Word; from: "bank" | number } | null>(null);
  const [result,      setResult]      = useState<"correct" | "wrong" | null>(null);
  const [showHint,    setShowHint]    = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [score,       setScore]       = useState({ correct: 0, total: 0 });
  const [transLang,   setTransLang]   = useState<TransLang>("es");
  const dragOver = useRef<"bank" | number | null>(null);

  useEffect(() => {
    fetch("/api/game/sentences")
      .then(r => r.json())
      .then(({ sentences, error: e }) => {
        if (e) { setError(e); return; }
        if (!sentences?.length) { setError("No sentences found."); return; }
        const shuffled = shuffle(sentences);
        setSentences(shuffled);
        loadSentence(shuffled, 0);
      })
      .catch(() => setError("Cannot reach the server. Is it running?"))
      .finally(() => setLoading(false));
  }, []);

  function loadSentence(list: Sentence[], i: number) {
    const s = list[i];
    if (!s) return;
    const words: Word[] = s.words.map((w, idx) => ({ ...w, uid: `${w.form}-${idx}` }));
    setBank(shuffle(words));
    setSlots(Array(words.length).fill(null));
    setResult(null);
    setShowHint(false);
    setIndex(i);
  }

  function onDragStartBank(word: Word) { setDragItem({ word, from: "bank" }); }
  function onDragStartSlot(word: Word, slotIdx: number) { setDragItem({ word, from: slotIdx }); }

  function onDrop(target: "bank" | number) {
    if (!dragItem) return;
    const newSlots = [...slots];
    const newBank  = [...bank];
    const existing = typeof target === "number" ? newSlots[target] : null;

    if (dragItem.from === "bank") {
      const bi = newBank.findIndex(w => w.uid === dragItem.word.uid);
      if (bi !== -1) newBank.splice(bi, 1);
    } else {
      newSlots[dragItem.from] = null;
    }

    if (typeof target === "number") {
      newSlots[target] = dragItem.word;
      if (existing) newBank.push(existing);
    } else {
      newBank.push(dragItem.word);
    }

    setSlots(newSlots);
    setBank(newBank);
    setDragItem(null);
    dragOver.current = null;
  }

  function checkAnswer() {
    if (slots.some(s => s === null)) return;
    const correct = slots.every((part, idx) => part?.position === idx);
    setResult(correct ? "correct" : "wrong");
    setScore(s => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
    if (user) saveSentenceResult(sentences[index].id, correct).catch(() => {});
  }

  function tryAgain() {
    const s = sentences[index];
    if (!s) return;
    const words: Word[] = s.words.map((w, idx) => ({ ...w, uid: `${w.form}-${idx}` }));
    setBank(shuffle(words));
    setSlots(Array(words.length).fill(null));
    setResult(null);
    setShowHint(false);
  }

  function next() {
    const nextIdx = index + 1;
    if (nextIdx < sentences.length) {
      loadSentence(sentences, nextIdx);
    } else {
      const reshuffled = shuffle(sentences);
      setSentences(reshuffled);
      loadSentence(reshuffled, 0);
    }
  }

  const current        = sentences[index];
  const allPlaced      = bank.length === 0;
  const firstWord      = current?.words.find(w => w.position === 0)?.form ?? "";
  const translationText = current?.translation?.[transLang] ?? current?.translation?.es ?? "";

  if (loading) return (
    <div className={S.loadingScreen}>
      <div className={S.loadingRing} />
    </div>
  );

  if (error) return (
    <div className={S.errorScreen}>
      <div className="text-[40px]">😕</div>
      <div className={S.errorText}>{error}</div>
    </div>
  );

  return (
    <div className={S.page}>
      <main className={S.main}>

        {/* Header */}
        <div className={S.header}>
          <div>
            <h1 className={S.title}>Sentence Builder</h1>
            <p className={S.subtitle}>Translate the sentence into English</p>
          </div>
          <div className={S.scoreBox}>
            <div className={S.scoreNumber}>{score.correct}/{score.total}</div>
            <div className={S.scoreLabel}>Score</div>
          </div>
        </div>

        {/* Legend */}
        <div className={S.legendRow}>
          {S.LEGEND.map(l => {
            const st = S.getTokenStyle(l.type);
            return (
              <div
                key={l.type}
                className={S.legendPill}
                style={{ background: st.bg, border: `1.5px solid ${st.border}`, color: st.text }}
              >
                <span className={S.legendDot} style={{ background: st.text }} />
                {l.label}
              </div>
            );
          })}
        </div>

        {/* Game card */}
        <div className={S.card}>

          {/* Progress bar */}
          <div className={S.progressRow}>
            <div className={S.progressTrack}>
              <div
                className={`${S.progressFill} bg-[var(--grad-progress)]`}
                style={{ width: `${((index + 1) / sentences.length) * 100}%` }}
              />
            </div>
            <span className={S.progressLabel}>{index + 1} / {sentences.length}</span>
          </div>

          {/* Sentence to translate */}
          {current && (
            <div className={S.promptBox}>
              <div className="flex items-center justify-between mb-1">
                <p className={`${S.promptEyebrow} m-0`}>Translate into English</p>
                <div className="flex gap-[6px]">
                  {(["es", "ru"] as TransLang[]).map(lang => (
                    <button
                      key={lang}
                      onClick={() => setTransLang(lang)}
                      className={`text-[11px] font-bold py-[2px] px-[10px] rounded-[20px] border-[1.5px] cursor-pointer transition-all ${
                        transLang === lang
                          ? "border-[var(--c-purple-muted)] bg-[var(--c-purple-tint)] text-[var(--c-purple)]"
                          : "border-[var(--border-medium)] bg-transparent text-[var(--text-secondary)]"
                      }`}
                    >
                      {lang.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <p className={S.promptText}>{translationText || "—"}</p>
            </div>
          )}

          {/* Answer slots */}
          <div className={S.slotsArea}>
            <p className={S.sectionLabel}>Build the sentence</p>
            <div
              className="min-h-[80px] rounded-[16px] p-3 flex flex-wrap gap-2 items-center transition-[border-color] duration-150"
              style={{ border: S.dropZoneBorder(dragOver.current === "bank") }}
              onDragOver={e => { e.preventDefault(); dragOver.current = "bank"; }}
              onDrop={() => onDrop("bank")}
            >
              {slots.map((word, idx) => {
                const st = word ? S.getTokenStyle(word.word_type) : null;
                return (
                  <div
                    key={idx}
                    className={S.slot}
                    style={{
                      ...S.slotBorderStyle(st ? st.border : null, dragOver.current === idx),
                      background: st ? st.bg : "var(--bg-surface)",
                      cursor:     word ? "grab" : "default",
                    }}
                    draggable={!!word}
                    onDragStart={() => word && onDragStartSlot(word, idx)}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); dragOver.current = idx; }}
                    onDrop={e => { e.stopPropagation(); onDrop(idx); }}
                  >
                    {word ? (
                      <>
                        <span className="font-bold text-[15px]" style={{ color: st!.text }}>{word.form}</span>
                        {st!.label && <span className="text-[9px] opacity-70 font-semibold" style={{ color: st!.text }}>{st!.label}</span>}
                      </>
                    ) : (
                      <span className={S.slotEmpty}>_</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Word bank */}
          <div className={S.bankArea}>
            <p className={S.sectionLabel}>Word bank</p>
            <div className={S.bankPool}>
              {bank.length === 0 ? (
                <span className={S.bankEmpty}>All words placed ✓</span>
              ) : bank.map(word => {
                const st = S.getTokenStyle(word.word_type);
                return (
                  <div
                    key={word.uid}
                    draggable
                    onDragStart={() => onDragStartBank(word)}
                    className={S.bankChip}
                    style={{ border: `2px solid ${st.border}`, background: st.bg }}
                  >
                    <span className="font-bold text-[15px]" style={{ color: st.text }}>{word.form}</span>
                    {st.label && <span className="text-[9px] opacity-70 font-semibold" style={{ color: st.text }}>{st.label}</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div
              className={`px-5 py-[14px] rounded-[14px] mb-5 font-bold text-[15px] flex items-center gap-[10px] border-[1.5px] ${
                result === "correct"
                  ? "bg-[var(--state-correct-bg)] border-[var(--state-correct-bd)] text-[var(--state-correct)]"
                  : "bg-[var(--state-wrong-bg)] border-[var(--state-wrong-bd)] text-[var(--state-wrong)]"
              }`}
            >
              {result === "correct" ? "✅ Correct!" : "❌ Not quite — try again or skip"}
              {result === "correct" && current?.full_text && (
                <span className="font-normal text-[var(--text-secondary)] text-[13px]">→ {current.full_text}</span>
              )}
            </div>
          )}

          {/* Hint — reveals only the first word */}
          {showHint && (
            <div className={S.hintBox}>
              💡 The sentence starts with: <span className="font-bold">"{firstWord}"</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className={S.actionsRow}>
          {result === "wrong" ? (
            <>
              <button
                onClick={tryAgain}
                className={`${S.btnCheckBase} cursor-pointer bg-[var(--grad-btn-danger)] text-white`}
              >
                🔄 Try again
              </button>
              <button onClick={next} className={S.btnSecondary}>
                Skip →
              </button>
            </>
          ) : result === "correct" ? (
            <button
              onClick={next}
              className={`${S.btnCheckBase} cursor-pointer bg-[var(--grad-green-blue)] text-white`}
            >
              Next →
            </button>
          ) : (
            <>
              <button
                onClick={checkAnswer}
                disabled={!allPlaced}
                className={`${S.btnCheckBase} ${
                  allPlaced
                    ? "cursor-pointer bg-[var(--grad-purple-green)] text-white"
                    : "cursor-not-allowed bg-[var(--bg-surface)] text-[var(--text-tertiary)]"
                }`}
              >
                Check answer
              </button>
              <button
                onClick={() => setShowHint(h => !h)}
                className={S.btnSecondary}
              >
                💡 Hint
              </button>
              <button onClick={next} className={S.btnSecondary}>
                Skip →
              </button>
            </>
          )}
        </div>

        {/* Dot navigation */}
        <div className={S.dotsRow}>
          {sentences.map((_, i) => (
            <div
              key={i}
              onClick={() => loadSentence(sentences, i)}
              className={`${S.dot} ${i === index ? "w-5 bg-[var(--c-purple)]" : "w-2 bg-[var(--border-medium)]"}`}
            />
          ))}
        </div>

      </main>
    </div>
  );
}
