from dataclasses import dataclass
from datetime import datetime

from app.modules.progress.domain.value_objects import Mastery


@dataclass
class SentenceProgress:
    """Aggregate root for a user's progress on a single sentence exercise."""
    user_id: str
    exercise_id: int | str
    attempts: int
    correct_count: int
    mastery: Mastery
    next_review_at: datetime
    last_attempted_at: datetime
    id: int | str | None = None  # DB-assigned; absent for not-yet-persisted records


@dataclass
class WordProgress:
    """Aggregate root for a user's progress on a single (lemma, language) word."""
    user_id: str
    lemma: str
    language: str
    attempts: int
    correct_count: int
    id: int | str | None = None
