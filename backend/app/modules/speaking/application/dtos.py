from dataclasses import dataclass

from app.modules.speaking.domain.value_objects import TaskType


@dataclass
class CheckPronunciationCommand:
    """Input to the check use case (assembled in the presentation layer)."""
    user_id: str
    exercise_id: int | str
    expected_text: str
    course_lang: str
    audio: bytes
    audio_format: str
    task_type: TaskType = TaskType.PHRASE
    attempt_no: int = 1
