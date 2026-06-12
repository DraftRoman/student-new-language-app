export type SpeechLang = "en-US" | "es-ES" | "ru-RU";
export declare function useSpeechSynthesis(): {
    speak: (text: string, lang: SpeechLang, rate?: number, pitch?: number) => void;
    cancel: () => void;
};
