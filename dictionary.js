import { state } from "./state.js";

export async function loadPairs(language) {
  const dictionaryPath = getDictionaryPath(language);
  const response = await fetch(dictionaryPath);
  state.dictionary = await response.json();
}

function getDictionaryPath(language) {
  applyEmojiStyles(language);

  switch (language) {
    case "en-es":
      return "./dictionary-en-es.json";
    case "en-ru":
      return "./dictionary-en-ru.json";
    case "es-ru":
      return "./dictionary-es-ru.json";
    default:
      return "./dictionary-es-emojis.json";
  }
}

function applyEmojiStyles(language) {
  const buttons = document.querySelectorAll("#right-buttons button");
  const emojiClass = "emojis";

  state.isEmojis = language === "es-emojis";

  buttons.forEach(btn => {
    if (state.isEmojis) btn.classList.add(emojiClass);
    else btn.classList.remove(emojiClass);
  });
}