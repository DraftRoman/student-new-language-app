import type { ReactNode } from "react";

interface ModalBackdropProps {
  onClose:  () => void;
  children: ReactNode;
}

export default function ModalBackdrop({ onClose, children }: ModalBackdropProps) {
  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--overlay-modal)] backdrop-blur-[18px] p-4"
    >
      <div className="absolute w-[520px] h-[520px] rounded-full pointer-events-none blur-[40px] bg-[var(--glow-purple)] -translate-x-[30%] -translate-y-[20%]" />
      <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none blur-[40px] bg-[var(--glow-green)] translate-x-[20%] translate-y-[25%]" />
      {children}
    </div>
  );
}
