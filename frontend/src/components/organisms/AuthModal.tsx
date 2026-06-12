import { useState } from "react";
import AuthForm from "../AuthForm";
import TurtlePeek, { type TurtleState } from "../TurtlePeek";
import { GlassCard, GradientText, ModalBackdrop } from "../ui";

interface AuthModalProps {
  onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
  const [turtleState, setTurtleState] = useState<TurtleState>("idle");

  return (
    <ModalBackdrop onClose={onClose}>
      <GlassCard
        className="slide-up w-full max-w-[500px] pt-[60px] px-14 pb-14"
        onClick={e => e.stopPropagation()}
      >
        {/* turtle */}
        <div className="absolute top-[-90px] left-1/2 -translate-x-1/2 pointer-events-none z-10">
          <TurtlePeek state={turtleState} />
        </div>

        {/* close */}
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--bg-surface)] border border-[var(--border-light)] cursor-pointer flex items-center justify-center text-[13px] text-[var(--text-secondary)] flex-shrink-0 transition-all duration-200 hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]">✕</button>

        {/* header */}
        <div className="text-center mb-7">
          <GradientText
            as="h2"
            gradient={turtleState === "happy" ? "green_blue" : "purple_yellow_green"}
            className="text-[1.6rem] font-black m-0"
          >
            {turtleState === "happy" ? "🎉 Welcome!" : "Welcome back"}
          </GradientText>
          <p className="text-sm text-[var(--text-secondary)] mt-2 mb-0">
            Sign in or create your free account
          </p>
        </div>

        <AuthForm
          onPasswordFocus={() => setTurtleState("covering")}
          onPasswordBlur={() => setTurtleState(s => s === "happy" ? "happy" : "idle")}
          onPasswordTyping={() => setTurtleState(s => s === "happy" ? "happy" : "covering")}
          onSuccess={() => setTurtleState("happy")}
          onError={() => setTurtleState("wondered")}
          onTyping={() => setTurtleState(s => s === "wondered" ? "idle" : s)}
        />
      </GlassCard>
    </ModalBackdrop>
  );
}
