import type { SpeechLang } from "../hooks/useSpeechSynthesis";
export type GameLang = "en-es" | "en-ru" | "es-ru" | "es-emojis" | "en-image" | "es-image" | "image-en" | "image-es";
export declare function getSpeechLang(gameLang: GameLang, isQuestion?: boolean): SpeechLang;
