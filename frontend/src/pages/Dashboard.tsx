import { useNavigate } from "react-router-dom";

interface GameCard { accent: string; label: string; heading: string; sub: string; cta: string; }

const gameCard = ({ accent, label, heading, sub, cta }: GameCard, onClick: () => void) => (
  <div
    onClick={onClick}
    className="relative rounded-[24px] overflow-hidden cursor-pointer shadow-[var(--shadow-game-card)] transition-transform duration-200 hover:-translate-y-[3px]"
  >
    <div className="absolute inset-0" style={{ background: accent }} />
    <div className="absolute inset-0 bg-[var(--overlay-card)] backdrop-blur-[1px]" />
    <div className="relative px-8 py-9 flex justify-between items-center gap-6 flex-wrap">
      <div>
        <p className="text-white text-[0.72rem] font-bold uppercase tracking-[0.1em] mb-[6px]">{label}</p>
        <h2 className="text-[1.75rem] font-black text-white m-0">{heading}</h2>
        <p className="text-white/60 mt-[6px] text-sm">{sub}</p>
      </div>
      <button className="px-6 py-3 rounded-[14px] border-none cursor-pointer bg-[var(--card-btn-bg)] font-bold text-[0.95rem] text-[var(--card-btn-text)] whitespace-nowrap flex-shrink-0">
        {cta}
      </button>
    </div>
  </div>
);

const languagePairs = [
  { emoji: "🇬🇧", label: "English → Spanish", bg: "var(--c-blue-tint-md)",    border: "var(--c-blue-border)"   },
  { emoji: "🇷🇺", label: "English → Russian", bg: "var(--c-purple-tint)",     border: "var(--c-purple-border)" },
  { emoji: "🇪🇸", label: "Español → Emojis",  bg: "var(--c-yellow-tint-md)",  border: "var(--c-yellow-border)" },
  { emoji: "🌍",  label: "Spanish → Russian", bg: "var(--c-green-tint-md)",   border: "var(--c-green-border)"  },
];

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex-1 font-sans bg-[var(--bg-base)] min-h-full">
      <main className="max-w-[700px] mx-auto px-6 py-14 flex flex-col gap-10">

        {/* Header */}
        <div>
          <p className="text-[0.72rem] font-bold text-[var(--c-green)] uppercase tracking-[0.1em] mb-2">
            Welcome back
          </p>
          <h1 className="text-[2.25rem] font-black text-[var(--text-primary)] leading-tight m-0">
            Ready to play?
          </h1>
          <p className="text-[var(--text-secondary)] mt-2 text-base">
            Pick a language pair below and start matching words.
          </p>
        </div>

        {gameCard({ accent: "var(--grad-card-game)", label: "Quick start", heading: "Jump into a game", sub: "5 pairs per round · all languages", cta: "Play now →" }, () => navigate("/game"))}
        {gameCard({ accent: "var(--grad-card-sentence)", label: "Grammar · Drag & Drop", heading: "🧩 Sentence Builder", sub: "Arrange words in the right order", cta: "Play →" }, () => navigate("/sentence-builder"))}

        {/* Language pair grid */}
        <div>
          <h2 className="text-[0.7rem] font-bold uppercase tracking-[0.1em] text-[var(--text-secondary)] mb-4">
            Choose a language pair
          </h2>
          <div className="grid grid-cols-2 gap-[14px]">
            {languagePairs.map((l) => (
              <div
                key={l.label}
                onClick={() => navigate("/game")}
                className="rounded-[16px] px-5 py-[18px] flex items-center gap-3 cursor-pointer transition-transform duration-[180ms] hover:-translate-y-0.5"
                style={{ background: l.bg, border: `1.5px solid ${l.border}` }}
              >
                <span className="text-2xl">{l.emoji}</span>
                <span className="font-semibold text-[0.9rem] text-[var(--text-primary)]">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
