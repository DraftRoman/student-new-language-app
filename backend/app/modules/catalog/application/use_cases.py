import random

from app.modules.catalog.application.dtos import (
    SentenceDTO,
    WordMatchPairDTO,
    WordMatchResultDTO,
)
from app.modules.catalog.domain.entities import DictionaryEntry
from app.modules.catalog.domain.repositories import (
    DictionaryRepository,
    SentenceRepository,
)
from app.modules.catalog.domain.value_objects import LANG_MAP
from app.modules.catalog.infrastructure.supabase_repositories import resolve_image_url
from app.shared.exceptions import NotFoundError, ValidationError


class ListSentencesUseCase:
    def __init__(self, repo: SentenceRepository):
        self._repo = repo

    def execute(self, level: str | None) -> list[SentenceDTO]:
        sentences = self._repo.list_active(level=level)
        if not sentences:
            raise NotFoundError(
                "No sentences found. Run: node --env-file=.env seed-sentences.js"
            )
        return [
            SentenceDTO(
                id=s.id,
                level=s.level,
                full_text=s.full_text,
                translation={"es": s.translation.es, "ru": s.translation.ru},
                words=s.words,
            )
            for s in sentences
        ]


def _resolve_field(entry: DictionaryEntry, field: str) -> str | None:
    if field == "lemma":
        return entry.lemma
    if field == "image":
        return resolve_image_url(f"imagesTurtle/{entry.image}") if entry.image else None
    return entry.translation.get(field)


class GetWordMatchUseCase:
    def __init__(self, repo: DictionaryRepository):
        self._repo = repo

    def execute(self, language: str, limit: int) -> WordMatchResultDTO:
        config = LANG_MAP.get(language)
        if config is None:
            raise ValidationError(f"Unknown language: {language}")

        is_image_mode = config.image_mode is not None
        entries = self._repo.list_entries(limit=50, with_image_only=is_image_mode)
        if not entries:
            raise NotFoundError("No words found.")

        pool: list[WordMatchPairDTO] = []
        for entry in entries:
            q = _resolve_field(entry, config.q)
            a = _resolve_field(entry, config.a)
            if q and a:
                pool.append(WordMatchPairDTO(question=q, answer=a))

        if not pool:
            raise NotFoundError(
                f'No words found for "{language}". '
                "The dictionary may not have those translations yet."
            )

        random.shuffle(pool)
        return WordMatchResultDTO(pairs=pool[:limit], image_mode=config.image_mode)
