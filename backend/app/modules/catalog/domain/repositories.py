from typing import Protocol

from app.modules.catalog.domain.entities import DictionaryEntry, Sentence


class SentenceRepository(Protocol):
    def list_active(self, level: str | None = None) -> list[Sentence]: ...


class DictionaryRepository(Protocol):
    def list_entries(self, limit: int, with_image_only: bool) -> list[DictionaryEntry]: ...
