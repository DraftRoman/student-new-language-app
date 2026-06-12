from datetime import UTC, datetime, timedelta

from app.modules.progress.domain.entities import SentenceProgress, WordProgress
from app.modules.progress.domain.value_objects import Mastery


class SpacedRepetition:
    """Pure domain service — no I/O. Computes new state from old."""

    @staticmethod
    def initial_sentence_progress(
        user_id: str,
        exercise_id: int | str,
        correct: bool,
        now: datetime | None = None,
    ) -> SentenceProgress:
        now = now or datetime.now(UTC)
        mastery = Mastery(1 if correct else 0)
        return SentenceProgress(
            user_id=user_id,
            exercise_id=exercise_id,
            attempts=1,
            correct_count=1 if correct else 0,
            mastery=mastery,
            next_review_at=now + timedelta(days=1),
            last_attempted_at=now,
        )

    @staticmethod
    def apply_sentence_attempt(
        current: SentenceProgress,
        correct: bool,
        now: datetime | None = None,
    ) -> SentenceProgress:
        now = now or datetime.now(UTC)
        new_mastery = current.mastery.adjusted(+1 if correct else -1)
        return SentenceProgress(
            id=current.id,
            user_id=current.user_id,
            exercise_id=current.exercise_id,
            attempts=current.attempts + 1,
            correct_count=current.correct_count + (1 if correct else 0),
            mastery=new_mastery,
            next_review_at=now + timedelta(days=new_mastery.days_until_next_review),
            last_attempted_at=now,
        )

    @staticmethod
    def initial_word_progress(
        user_id: str,
        lemma: str,
        language: str,
        correct: bool,
    ) -> WordProgress:
        return WordProgress(
            user_id=user_id,
            lemma=lemma,
            language=language,
            attempts=1,
            correct_count=1 if correct else 0,
        )

    @staticmethod
    def apply_word_attempt(current: WordProgress, correct: bool) -> WordProgress:
        return WordProgress(
            id=current.id,
            user_id=current.user_id,
            lemma=current.lemma,
            language=current.language,
            attempts=current.attempts + 1,
            correct_count=current.correct_count + (1 if correct else 0),
        )
