// ── Static layout ─────────────────────────────────────────────────
export const page    = "flex-1 bg-[var(--bg-base)] min-h-full";
export const main    = "max-w-[760px] mx-auto px-5 py-10";

// Loading / error screens
export const loadingScreen = "min-h-[80vh] flex items-center justify-center bg-[var(--bg-base)]";
export const loadingRing   = "w-10 h-10 border-[3px] border-[var(--c-purple-ring)] border-t-[var(--c-purple)] rounded-full animate-spin";
export const errorScreen   = "min-h-[80vh] flex items-center justify-center flex-col gap-3 bg-[var(--bg-base)]";
export const errorText     = "text-[var(--text-secondary)] text-sm";

// Header
export const header       = "flex items-start justify-between mb-6";
export const title        = "bg-[var(--grad-purple-green)] bg-clip-text text-transparent text-[1.75rem] font-extrabold m-0";
export const subtitle     = "text-[var(--text-secondary)] mt-1 text-sm";
export const scoreBox     = "bg-[var(--bg-card)] border-[1.5px] border-[var(--border-subtle)] rounded-[16px] px-5 py-3 text-center";
export const scoreNumber  = "text-2xl font-extrabold text-[var(--text-primary)]";
export const scoreLabel   = "text-[0.7rem] text-[var(--text-secondary)] font-bold uppercase tracking-[0.05em]";

// Legend
export const legendRow  = "flex gap-2 flex-wrap mb-5";
export const legendPill = "flex items-center gap-[5px] rounded-full px-3 py-1 text-xs font-semibold";
export const legendDot  = "w-[6px] h-[6px] rounded-full inline-block";

// Game card
export const card = "bg-[var(--bg-card)] rounded-[24px] border-[1.5px] border-[var(--border-subtle)] p-7 shadow-[var(--shadow-card)]";

// Progress bar
export const progressRow   = "flex items-center gap-3 mb-6";
export const progressTrack = "flex-1 h-[6px] bg-[var(--border-subtle)] rounded-full overflow-hidden";
export const progressFill  = "h-full rounded-full transition-[width] duration-[400ms]";
export const progressLabel = "text-xs text-[var(--text-secondary)] font-semibold whitespace-nowrap";

// Prompt box (sentence to translate)
export const promptBox     = "mb-6 bg-[var(--c-purple-dim)] border border-[var(--c-purple-tint-bd)] rounded-[16px] px-5 py-4";
export const promptEyebrow = "text-[0.65rem] font-bold uppercase tracking-[0.12em] text-[var(--c-purple-muted)] mb-1";
export const promptText    = "text-[1.15rem] font-bold text-[var(--text-primary)] m-0";

// Section labels
export const sectionLabel = "text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-3";

// Slots area
export const slotsArea = "mb-6";
export const slot      = "min-w-[64px] h-14 rounded-[12px] flex flex-col items-center justify-center gap-0.5 transition-all duration-150";
export const slotEmpty = "text-[var(--text-tertiary)] text-xl";

// Token text classes (used in className, not inline style)
// font-bold text-[15px]          → word form
// text-[9px] opacity-70 font-semibold → type label

// Word bank
export const bankArea  = "mb-6";
export const bankPool  = "min-h-16 bg-[var(--bg-surface)] rounded-[16px] p-3 flex flex-wrap gap-2 items-center";
export const bankEmpty = "text-[var(--text-secondary)] text-[13px]";
export const bankChip  = "px-4 py-[10px] rounded-[12px] cursor-grab flex flex-col items-center gap-0.5 select-none transition-transform duration-100 hover:scale-105";

// Hint box
export const hintBox = "bg-[var(--c-blue-dim)] border-[1.5px] border-[var(--c-blue-border)] rounded-[14px] px-[18px] py-3 mb-5 text-sm text-[var(--c-blue)]";

// Action buttons row
export const actionsRow   = "flex gap-3 mt-5";
export const btnSecondary = "px-5 py-4 rounded-[16px] border-[1.5px] border-[var(--border-light)] bg-[var(--bg-surface)] cursor-pointer font-semibold text-sm text-[var(--text-secondary)]";
export const btnCheckBase = "flex-1 px-6 py-4 rounded-[16px] border-none font-bold text-base transition-all duration-200";

// Dot navigation
export const dotsRow = "flex justify-center gap-[6px] mt-5";
export const dot      = "h-2 rounded-full cursor-pointer transition-all duration-200";

// ── Dynamic style helpers ─────────────────────────────────────────

// Token type → color palette (light backgrounds work in both modes)
export const TYPE_STYLE: Record<string, { bg: string; border: string; text: string; label: string }> = {
  noun:         { bg: "var(--token-noun-bg)",   border: "var(--token-noun-bd)",   text: "var(--token-noun-text)",   label: "noun"   },
  verb:         { bg: "var(--token-verb-bg)",   border: "var(--token-verb-bd)",   text: "var(--token-verb-text)",   label: "verb"   },
  adjective:    { bg: "var(--token-adj-bg)",    border: "var(--token-adj-bd)",    text: "var(--token-adj-text)",    label: "adj"    },
  adverb:       { bg: "var(--token-adv-bg)",    border: "var(--token-adv-bd)",    text: "var(--token-adv-text)",    label: "adv"    },
  pronoun:      { bg: "var(--token-pron-bg)",   border: "var(--token-pron-bd)",   text: "var(--token-pron-text)",   label: "pron"   },
  preposition:  { bg: "var(--token-prep-bg)",   border: "var(--token-prep-bd)",   text: "var(--token-prep-text)",   label: "prep"   },
  conjunction:  { bg: "var(--token-conj-bg)",   border: "var(--token-conj-bd)",   text: "var(--token-conj-text)",   label: "conj"   },
  interjection: { bg: "var(--token-interj-bg)", border: "var(--token-interj-bd)", text: "var(--token-interj-text)", label: "interj" },
};

export const FALLBACK_STYLE = { bg: "var(--token-other-bg)", border: "var(--token-other-bd)", text: "var(--token-other-text)", label: "" };

export function getTokenStyle(type: string) {
  return TYPE_STYLE[type] ?? { ...FALLBACK_STYLE, label: type };
}

// Legend items to display
export const LEGEND = [
  { type: "noun",        label: "Noun"        },
  { type: "verb",        label: "Verb"        },
  { type: "adjective",   label: "Adjective"   },
  { type: "adverb",      label: "Adverb"      },
  { type: "pronoun",     label: "Pronoun"     },
  { type: "preposition", label: "Preposition" },
];

// Progress bar fill colour (used via bg-[var(--grad-progress)] in className)

// Result box — use Tailwind conditional in JSX:
// correct: bg-[var(--state-correct-bg)] border-[var(--state-correct-bd)] text-[var(--state-correct)]
// wrong:   bg-[var(--state-wrong-bg)]   border-[var(--state-wrong-bd)]   text-[var(--state-wrong)]

// Check button — use Tailwind conditional in JSX:
// active:   cursor-pointer bg-[var(--grad-purple-green)] text-white
// inactive: cursor-not-allowed bg-[var(--bg-surface)] text-[var(--text-tertiary)]

// Dot nav — use Tailwind conditional in JSX:
// active: w-5 bg-[var(--c-purple)]
// idle:   w-2 bg-[var(--border-medium)]

// Slot border (dashed, highlights on dragover)
export function slotBorderStyle(border: string | null, isOver: boolean) {
  return {
    border:     `2px dashed ${border ?? "var(--border-medium)"}`,
    background: "transparent",
    outline:    isOver ? "2px solid var(--c-purple)" : "none",
  };
}

// Drop zone border (slots area wrapper)
export function dropZoneBorder(isOver: boolean) {
  return `2px dashed ${isOver ? "var(--c-purple)" : "var(--border-medium)"}`;
}
