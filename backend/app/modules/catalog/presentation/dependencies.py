from fastapi import Depends

from app.modules.catalog.application.use_cases import (
    GetWordMatchUseCase,
    ListSentencesUseCase,
)
from app.modules.catalog.domain.repositories import (
    DictionaryRepository,
    SentenceRepository,
)
from app.modules.catalog.infrastructure.supabase_repositories import (
    SupabaseDictionaryRepository,
    SupabaseSentenceRepository,
)


def get_sentence_repository() -> SentenceRepository:
    return SupabaseSentenceRepository()


def get_dictionary_repository() -> DictionaryRepository:
    return SupabaseDictionaryRepository()


def get_list_sentences_use_case(
    repo: SentenceRepository = Depends(get_sentence_repository),
) -> ListSentencesUseCase:
    return ListSentencesUseCase(repo)


def get_word_match_use_case(
    repo: DictionaryRepository = Depends(get_dictionary_repository),
) -> GetWordMatchUseCase:
    return GetWordMatchUseCase(repo)
