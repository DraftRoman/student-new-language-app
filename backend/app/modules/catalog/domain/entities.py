from dataclasses import dataclass
from typing import Any

from app.modules.catalog.domain.value_objects import Translation


@dataclass(frozen=True)
class Sentence:
    id: int | str
    level: str | None
    full_text: str
    translation: Translation
    words: Any  # opaque JSON payload consumed by the frontend


@dataclass(frozen=True)
class DictionaryEntry:
    lemma: str
    translation: dict[str, str | None]  # e.g. {"es": ..., "ru": ..., "emoji": ...}
    image: str | None
