import type { SpeechLang } from "../hooks/useSpeechSynthesis";

export type GameLang =
  | "en-es" | "en-ru" | "es-ru" | "es-emojis"
  | "en-image" | "es-image" | "image-en" | "image-es";

export function getSpeechLang(
  gameLang: GameLang,
  isQuestion: boolean = true
): SpeechLang {
  const map: Record<GameLang, SpeechLang> = {
    "en-es":     isQuestion ? "en-US" : "es-ES",
    "en-ru":     isQuestion ? "en-US" : "ru-RU",
    "es-ru":     isQuestion ? "es-ES" : "ru-RU",
    "es-emojis": "es-ES",
  
    "en-image":  "en-US",   
    "es-image":  "es-ES",   
    "image-en":  "en-US", 
    "image-es":  "es-ES",  
  };

  return map[gameLang];
}