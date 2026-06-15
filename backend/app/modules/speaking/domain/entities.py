from dataclasses import dataclass

from app.modules.speaking.domain.value_objects import PronunciationScore, TaskType


@dataclass
class PronunciationAttempt:
    """Aggregate root for one scored pronunciation attempt.

    Holds only metadata + score — never the raw audio (deleted after scoring
    per the v1 retention policy `[OPEN #6]`). Persisted by
    `PronunciationAttemptRepository`; `id` is DB-assigned.
    """
    user_id: str
    exercise_id: int | str
    course_lang: str
    task_type: TaskType
    expected_text: str
    recognized_text: str
    score: PronunciationScore
    attempt_no: int = 1
    id: int | str | None = None
