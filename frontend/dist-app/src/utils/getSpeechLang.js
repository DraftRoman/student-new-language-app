export function getSpeechLang(gameLang, isQuestion = true) {
    const map = {
        "en-es": isQuestion ? "en-US" : "es-ES",
        "en-ru": isQuestion ? "en-US" : "ru-RU",
        "es-ru": isQuestion ? "es-ES" : "ru-RU",
        "es-emojis": "es-ES",
        "en-image": "en-US",
        "es-image": "es-ES",
        "image-en": "en-US",
        "image-es": "es-ES",
    };
    return map[gameLang];
}
