import { useCallback } from "react";
export function useSpeechSynthesis() {
    const speak = useCallback((text, lang, rate = 1, pitch = 1) => {
        if (typeof window === "undefined" || !window.speechSynthesis)
            return;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = rate;
        utterance.pitch = pitch;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    }, []);
    const cancel = useCallback(() => {
        if (typeof window === "undefined")
            return;
        window.speechSynthesis.cancel();
    }, []);
    return { speak, cancel };
}
