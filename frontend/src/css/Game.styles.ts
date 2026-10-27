export const page    = "flex-1 flex flex-col items-center font-sans bg-[var(--bg-base)]";

export const header  = "w-full max-w-[800px] text-center mt-8 mb-8 px-4";
export const title   = "bg-[var(--grad-purple-green)] bg-clip-text text-transparent text-[1.75rem] font-black";
export const score   = "score-badge mx-auto mb-4";
export const select  = "lang-select";

export const card    = "game-card bg-[var(--bg-card)]";
export const column  = "game-column";

export const btn: Record<string, string> = {
  base:  "game-btn",
  emoji: "game-btn emojis",
  image: "game-btn image-card",
};

export const spinner = "flex flex-col items-center gap-4 mt-20 text-[var(--text-secondary)]";
export const ring    = "w-10 h-10 rounded-full animate-spin border-2 border-[var(--state-correct-bg)] border-t-[var(--c-green)]";

export const errorBox   = "flex flex-col items-center gap-4 mt-20";
export const errorRetry = "mt-2 px-6 py-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-semibold cursor-pointer";

export const roundComplete = "mt-6 rounded-2xl px-8 py-4 text-center fade-in bg-[var(--state-correct-bg)] border border-[var(--state-correct-bd)]";
export const roundText     = "text-[var(--c-green)] font-bold text-[1.1rem]";

export const screenCounter = "text-[var(--text-secondary)] text-sm font-semibold mb-3";

export const summary         = "game-card bg-[var(--bg-card)] flex flex-col items-center gap-3 text-center px-8 py-10 max-w-[480px] fade-in";
export const summaryTitle    = "text-[1.5rem] font-black text-[var(--text-primary)] m-0";
export const summaryText     = "text-[var(--text-secondary)] text-base m-0";
export const summaryAccuracy = "text-[var(--c-green)] font-bold text-[1.1rem] m-0";
export const summaryButtons  = "flex flex-wrap justify-center gap-3 mt-4";
export const summaryBtnPrimary   = "px-6 py-3 rounded-2xl border-none bg-[var(--grad-purple-green)] text-white text-sm font-bold cursor-pointer shadow-[var(--shadow-btn-primary)] hover:-translate-y-0.5 transition-transform";
export const summaryBtnSecondary = "px-6 py-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-surface)] text-[var(--text-secondary)] text-sm font-semibold cursor-pointer hover:-translate-y-0.5 transition-transform";
