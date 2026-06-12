from app.modules.progress.domain.repositories import (
    SentenceProgressRepository,
    WordProgressRepository,
)
from app.modules.progress.domain.services import SpacedRepetition


class SaveSentenceProgressUseCase:
    def __init__(self, repo: SentenceProgressRepository):
        self._repo = repo

    def execute(self, user_id: str, exercise_id: int | str, correct: bool) -> None:
        existing = self._repo.find(user_id, exercise_id)
        if existing is None:
            progress = SpacedRepetition.initial_sentence_progress(
                user_id=user_id, exercise_id=exercise_id, correct=correct,
            )
        else:
            progress = SpacedRepetition.apply_sentence_attempt(existing, correct=correct)
        self._repo.save(progress)


class ListSentenceProgressUseCase:
    def __init__(self, repo: SentenceProgressRepository):
        self._repo = repo

    def execute(self, user_id: str) -> dict:
        items = self._repo.list_for_user(user_id)
        return {
            str(p.exercise_id): {
                "attempts": p.attempts,
                "correct": p.correct_count,
                "mastery": p.mastery.level,
                "last_attempted": p.last_attempted_at.isoformat(),
            }
            for p in items
        }


class SaveWordProgressUseCase:
    def __init__(self, repo: WordProgressRepository):
        self._repo = repo

    def execute(self, user_id: str, lemma: str, language: str, correct: bool) -> None:
        existing = self._repo.find(user_id, lemma, language)
        if existing is None:
            progress = SpacedRepetition.initial_word_progress(
                user_id=user_id, lemma=lemma, language=language, correct=correct,
            )
        else:
            progress = SpacedRepetition.apply_word_attempt(existing, correct=correct)
        self._repo.save(progress)
