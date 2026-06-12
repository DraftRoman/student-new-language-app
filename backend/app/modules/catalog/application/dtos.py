from dataclasses import dataclass
from typing import Any

from app.modules.catalog.domain.value_objects import ImageMode


@dataclass(frozen=True)
class SentenceDTO:
    id: int | str
    level: str | None
    full_text: str
    translation: dict[str, str | None]
    words: Any


@dataclass(frozen=True)
class WordMatchPairDTO:
    question: str
    answer: str


@dataclass(frozen=True)
class WordMatchResultDTO:
    pairs: list[WordMatchPairDTO]
    image_mode: ImageMode | None
