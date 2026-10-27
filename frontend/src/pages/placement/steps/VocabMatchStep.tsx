import { useMemo, useState } from "react";
import type { CefrLevel, VocabItem } from "../../../lib/placementService";
import { COPY } from "../copy";
import { useSpeechSynthesis } from "../../../hooks/useSpeechSynthesis";

interface Props {
  level:    CefrLevel;
  items:    VocabItem[];
  pageSize: number;
  onComplete: (answers: Record<string, string>) => void;
}

/** Static seeded shuffle so re-renders don't reorder cards mid-interaction. */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type SideState = "idle" | "selected" | "matched";

interface PageState {
  // questionIdx → matched answerIdx (or null)
  matched: Record<number, number | null>;
  selectedQ: number | null;
  selectedA: number | null;
}

const initialPage = (size: number): PageState => ({
  matched:   Object.fromEntries(Array.from({ length: size }, (_, i) => [i, null])),
  selectedQ: null,
  selectedA: null,
});

export default function VocabMatchStep({ level, items, pageSize, onComplete }: Props) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const [pageIdx, setPageIdx]   = useState(0);
  const [answers, setAnswers]   = useState<Record<string, string>>({});
  const [pageState, setPageState] = useState<PageState>(() => initialPage(pageSize));
  const { speak } = useSpeechSynthesis();

  const pageItems = useMemo(
    () => items.slice(pageIdx * pageSize, pageIdx * pageSize + pageSize),
    [items, pageIdx, pageSize],
  );

  // Shuffle the right column per page; seed by page so React re-renders
  // don't reshuffle as the user clicks.
  const shuffledAnswers = useMemo(
    () => seededShuffle(pageItems, pageIdx + 1),
    [pageItems, pageIdx],
  );

  const allMatched = pageItems.every((_, i) => pageState.matched[i] != null);

  const finishPage = () => {
    const next = { ...answers };
    pageItems.forEach((item, qIdx) => {
      const aIdx = pageState.matched[qIdx];
      if (aIdx != null) next[item.id] = shuffledAnswers[aIdx].answer;
    });
    if (pageIdx + 1 >= totalPages) {
      onComplete(next);
      return;
    }
    setAnswers(next);
    setPageIdx(pageIdx + 1);
    setPageState(initialPage(pageSize));
  };

  const tryMatch = (qIdx: number, aIdx: number) => {
    // If user clicks an already-matched cell, ignore (no undo here — the
    // rule is "1 wrong = 1 error", so any commit is final per page).
    if (pageState.matched[qIdx] != null) return;
    if (Object.values(pageState.matched).includes(aIdx)) return;
    setPageState({
      ...pageState,
      matched:   { ...pageState.matched, [qIdx]: aIdx },
      selectedQ: null,
      selectedA: null,
    });
  };

  const handleQ = (qIdx: number) => {
    if (pageState.matched[qIdx] != null) return;
    speak(pageItems[qIdx].question, "en-US");
    if (pageState.selectedA != null) {
      tryMatch(qIdx, pageState.selectedA);
      return;
    }
    setPageState({ ...pageState, selectedQ: qIdx });
  };

  const handleA = (aIdx: number) => {
    if (Object.values(pageState.matched).includes(aIdx)) return;
    speak(shuffledAnswers[aIdx].answer, "es-ES");
    if (pageState.selectedQ != null) {
      tryMatch(pageState.selectedQ, aIdx);
      return;
    }
    setPageState({ ...pageState, selectedA: aIdx });
  };

  const qState = (qIdx: number): SideState => {
    if (pageState.matched[qIdx] != null) return "matched";
    if (pageState.selectedQ === qIdx) return "selected";
    return "idle";
  };

  const aState = (aIdx: number): SideState => {
    if (Object.values(pageState.matched).includes(aIdx)) return "matched";
    if (pageState.selectedA === aIdx) return "selected";
    return "idle";
  };

  const cellClass = (s: SideState) => {
    const base = "py-3 px-3 rounded-[14px] text-[0.95rem] font-semibold border-[1.5px] transition-all duration-150 text-left";
    if (s === "matched") return `${base} bg-[var(--state-correct-bg)] border-[var(--state-correct-bd)] text-[var(--state-correct)] opacity-70 cursor-default`;
    if (s === "selected") return `${base} bg-[var(--c-purple-tint)] border-[var(--c-purple-muted)] text-[var(--c-purple)] cursor-pointer`;
    return `${base} bg-[var(--bg-surface)] border-[var(--border-medium)] text-[var(--text-primary)] cursor-pointer hover:-translate-y-0.5`;
  };

  return (
    <section className="flex flex-col gap-5 max-w-[640px] mx-auto px-6 py-8">
      <header>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--c-green)] mb-1">
          {COPY.test.eyebrow(level)} · {COPY.test.pageOf(pageIdx + 1, totalPages)}
        </p>
        <h2 className="text-[1.4rem] font-black text-[var(--text-primary)] m-0">
          {COPY.test.vocabHeading}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mt-1">{COPY.test.vocabHelp}</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          {pageItems.map((item, qIdx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleQ(qIdx)}
              disabled={qState(qIdx) === "matched"}
              className={cellClass(qState(qIdx))}
              aria-pressed={qState(qIdx) === "selected"}
            >
              {item.question}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          {shuffledAnswers.map((item, aIdx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleA(aIdx)}
              disabled={aState(aIdx) === "matched"}
              className={cellClass(aState(aIdx))}
              aria-pressed={aState(aIdx) === "selected"}
            >
              {item.answer}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={finishPage}
        disabled={!allMatched}
        className="w-full py-[14px] rounded-[14px] border-none text-base font-bold bg-[var(--grad-purple-green)] text-white shadow-[var(--shadow-btn-primary)] disabled:opacity-50 disabled:cursor-not-allowed enabled:hover:-translate-y-[2px] transition-transform duration-200"
      >
        {pageIdx + 1 >= totalPages ? COPY.test.submitLevel : COPY.test.nextPage}
      </button>
    </section>
  );
}
