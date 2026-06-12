from fastapi import Depends

from app.modules.progress.application.use_cases import (
    ListSentenceProgressUseCase,
    SaveSentenceProgressUseCase,
    SaveWordProgressUseCase,
)
from app.modules.progress.domain.repositories import (
    SentenceProgressRepository,
    WordProgressRepository,
)
from app.modules.progress.infrastructure.supabase_repositories import (
    SupabaseSentenceProgressRepository,
    SupabaseWordProgressRepository,
)


def get_sentence_progress_repository() -> SentenceProgressRepository:
    return SupabaseSentenceProgressRepository()


def get_word_progress_repository() -> WordProgressRepository:
    return SupabaseWordProgressRepository()


def get_save_sentence_progress_use_case(
    repo: SentenceProgressRepository = Depends(get_sentence_progress_repository),
) -> SaveSentenceProgressUseCase:
    return SaveSentenceProgressUseCase(repo)


def get_list_sentence_progress_use_case(
    repo: SentenceProgressRepository = Depends(get_sentence_progress_repository),
) -> ListSentenceProgressUseCase:
    return ListSentenceProgressUseCase(repo)


def get_save_word_progress_use_case(
    repo: WordProgressRepository = Depends(get_word_progress_repository),
) -> SaveWordProgressUseCase:
    return SaveWordProgressUseCase(repo)
