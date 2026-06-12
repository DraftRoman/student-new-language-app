from dataclasses import dataclass
from enum import Enum


class ImageMode(str, Enum):
    QUESTION = "question"
    ANSWER = "answer"


@dataclass(frozen=True)
class LanguagePair:
    """Describes how a word-match round is constructed.

    `q` / `a` select fields from a dictionary entry (e.g. "lemma", "es", "image").
    `image_mode` tells the frontend whether the question or the answer is an image URL.
    """
    q: str
    a: str
    image_mode: ImageMode | None


# Source of truth for supported word-match language pairs.
LANG_MAP: dict[str, LanguagePair] = {
    "en-es":     LanguagePair(q="lemma", a="es",    image_mode=None),
    "en-ru":     LanguagePair(q="lemma", a="ru",    image_mode=None),
    "es-ru":     LanguagePair(q="es",    a="ru",    image_mode=None),
    "es-emojis": LanguagePair(q="es",    a="emoji", image_mode=None),
    "en-image":  LanguagePair(q="lemma", a="image", image_mode=ImageMode.ANSWER),
    "es-image":  LanguagePair(q="es",    a="image", image_mode=ImageMode.ANSWER),
    "image-en":  LanguagePair(q="image", a="lemma", image_mode=ImageMode.QUESTION),
    "image-es":  LanguagePair(q="image", a="es",    image_mode=ImageMode.QUESTION),
}


@dataclass(frozen=True)
class WordPair:
    question: str
    answer: str


@dataclass(frozen=True)
class Translation:
    es: str | None
    ru: str | None
