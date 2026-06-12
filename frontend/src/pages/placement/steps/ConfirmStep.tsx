import { useState } from "react";
import type { CefrLevel } from "../../../lib/placementService";
import { COPY } from "../copy";

interface Props {
  recommended:    CefrLevel;
  allowedMax:     CefrLevel;
  busy:           boolean;
  onConfirm:      (chosen: CefrLevel) => void;
}

export default function ConfirmStep({ recommended, allowedMax, busy, onConfirm }: Props) {
  const overrideAvailable = allowedMax !== recommended;
  const [chosen, setChosen] = useState<CefrLevel>(recommended);
  const eyebrow = overrideAvailable ? COPY.confirm.eyebrowDefault : COPY.confirm.eyebrowCeiling;

  return (
    <section className="flex flex-col gap-6 max-w-[520px] mx-auto px-6 py-10">
      <header className="text-center">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.1em] text-[var(--c-green)] mb-2">
          {eyebrow}
        </p>
        <h1 className="text-[2rem] font-black text-[var(--text-primary)] m-0">
          {COPY.confirm.title(recommended)}
        </h1>
        <p className="text-[var(--text-secondary)] mt-3 text-[0.95rem]">
          {overrideAvailable
            ? COPY.confirm.overrideAvailable(allowedMax)
            : COPY.confirm.overrideDisabled}
        </p>
      </header>

      <div className="flex flex-col gap-3" role="radiogroup" aria-label="Pick your starting level">
        <button
          type="button"
          role="radio"
          aria-checked={chosen === recommended}
          onClick={() => setChosen(recommended)}
          className={`text-left p-4 rounded-[16px] border-[1.5px] cursor-pointer transition-all ${
            chosen === recommended
              ? "bg-[var(--c-green-tint-md)] border-[var(--c-green)] text-[var(--text-primary)]"
              : "bg-[var(--bg-surface)] border-[var(--border-medium)] text-[var(--text-primary)] hover:border-[var(--border-strong, var(--border-medium))]"
          }`}
        >
          <div className="font-bold text-[1rem]">{COPY.confirm.chooseRecommended(recommended)}</div>
        </button>

        {overrideAvailable && (
          <button
            type="button"
            role="radio"
            aria-checked={chosen === allowedMax}
            onClick={() => setChosen(allowedMax)}
            className={`text-left p-4 rounded-[16px] border-[1.5px] cursor-pointer transition-all ${
              chosen === allowedMax
                ? "bg-[var(--c-purple-tint)] border-[var(--c-purple-muted)] text-[var(--text-primary)]"
                : "bg-[var(--bg-surface)] border-[var(--border-medium)] text-[var(--text-primary)] hover:border-[var(--border-strong, var(--border-medium))]"
            }`}
          >
            <div className="font-bold text-[1rem]">{COPY.confirm.chooseOverride(allowedMax)}</div>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => onConfirm(chosen)}
        disabled={busy}
        className="w-full py-[16px] rounded-[16px] border-none cursor-pointer text-base font-bold bg-[var(--grad-purple-green)] text-white shadow-[var(--shadow-btn-primary)] disabled:opacity-60 disabled:cursor-not-allowed enabled:hover:-translate-y-[2px] transition-transform duration-200"
      >
        {busy ? COPY.confirm.confirming : COPY.confirm.confirmCta}
      </button>
    </section>
  );
}
