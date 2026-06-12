import { COPY } from "../copy";

interface Props {
  busy:    boolean;
  onAnswer: (studiedBefore: boolean) => void;
}

export default function PriorExperienceStep({ busy, onAnswer }: Props) {
  return (
    <section className="flex flex-col gap-7 max-w-[520px] mx-auto py-10 px-6">
      <header className="text-center">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--c-green)] mb-2">
          {COPY.gate.eyebrow}
        </p>
        <h1 className="text-[1.85rem] font-black text-[var(--text-primary)] leading-tight m-0">
          {COPY.gate.title}
        </h1>
        <p className="text-[var(--text-secondary)] mt-3 text-[0.95rem]">
          {COPY.gate.subtitle}
        </p>
      </header>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => onAnswer(true)}
          className="w-full py-[16px] rounded-[16px] border-none cursor-pointer text-base font-bold bg-[var(--grad-purple-green)] text-white shadow-[var(--shadow-btn-primary)] transition-[transform,opacity] duration-200 hover:enabled:-translate-y-[2px] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {COPY.gate.yes}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => onAnswer(false)}
          className="w-full py-[16px] rounded-[16px] border border-[var(--border-medium)] cursor-pointer text-base font-semibold bg-[var(--bg-surface)] text-[var(--text-primary)] transition-[background,transform] duration-200 hover:enabled:bg-[var(--bg-hover)] hover:enabled:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {COPY.gate.no}
        </button>
      </div>
    </section>
  );
}
