import { useCallback } from "react";

export type SpeechLang = "en-US" | "es-ES" | "ru-RU";

export function useSpeechSynthesis() {
  const speak = useCallback(
    (text: string, lang: SpeechLang, rate: number = 1, pitch: number = 1) => {
      if (typeof window === "undefined" || !window.speechSynthesis) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = rate;
      utterance.pitch = pitch;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    },
    []
  );

  const cancel = useCallback(() => {
    if (typeof window === "undefined") return;
    window.speechSynthesis.cancel();
  }, []);

  return { speak, cancel };
}