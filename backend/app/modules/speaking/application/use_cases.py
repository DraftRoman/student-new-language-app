"""Application orchestration for UC-PRON-01 — no framework imports.

Wires the OSS STT engine (supporting actor) to the pure scoring service and
persists attempt metadata. Audio is deleted right after scoring (retention
policy `[OPEN #6]`). The score is computed server-side only — the client
never sends a "result", only audio.
"""
import logging

from app.modules.speaking.application.dtos import CheckPronunciationCommand
from app.modules.speaking.domain.entities import PronunciationAttempt
from app.modules.speaking.domain.repositories import (
    PronunciationAttemptRepository,
    SttEngine,
)
from app.modules.speaking.domain.services import ScoringService
from app.modules.speaking.domain.value_objects import ScoreThresholds

logger = logging.getLogger(__name__)


class CheckPronunciationUseCase:
    def __init__(
        self,
        stt: SttEngine,
        thresholds: ScoreThresholds | None = None,
        attempts_repo: PronunciationAttemptRepository | None = None,
    ) -> None:
        self._stt = stt
        self._thresholds = thresholds or ScoreThresholds()
        self._attempts_repo = attempts_repo

    def execute(self, command: CheckPronunciationCommand) -> PronunciationAttempt:
        recognized = self._stt.transcribe(
            command.audio, command.audio_format, command.course_lang
        )
        score = ScoringService.score(
            expected_text=command.expected_text,
            recognized_text=recognized,
            language=command.course_lang,
            thresholds=self._thresholds,
        )
        attempt = PronunciationAttempt(
            user_id=command.user_id,
            exercise_id=command.exercise_id,
            course_lang=command.course_lang,
            task_type=command.task_type,
            expected_text=command.expected_text,
            recognized_text=recognized,
            score=score,
            attempt_no=command.attempt_no,
        )
        if self._attempts_repo is not None:
            # Persistence is best-effort: a metadata-write failure must not
            # block the learner's result (no lesson dead-end, postconditions §3).
            try:
                self._attempts_repo.save(attempt)
            except Exception:
                logger.warning(
                    "pronunciation: failed to persist attempt (user=%s exercise=%s)",
                    command.user_id,
                    command.exercise_id,
                    exc_info=True,
                )
        return attempt
