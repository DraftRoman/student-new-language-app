"""FastAPI Depends factories for the speaking context.

The STT engine is a process-wide singleton (heavy model weights load once and
are cached). Tests swap in a fake engine via `app.dependency_overrides` —
overriding `get_stt_engine` is enough, since the use case is built around it.
"""
from functools import lru_cache

from fastapi import Depends

from app.config import settings
from app.modules.speaking.application.use_cases import CheckPronunciationUseCase
from app.modules.speaking.domain.repositories import (
    PronunciationAttemptRepository,
    SttEngine,
)
from app.modules.speaking.domain.value_objects import ScoreThresholds
from app.modules.speaking.infrastructure.faster_whisper_engine import FasterWhisperEngine
from app.modules.speaking.infrastructure.supabase_repositories import (
    SupabasePronunciationAttemptRepository,
)


@lru_cache(maxsize=1)
def _engine() -> SttEngine:
    return FasterWhisperEngine(
        model_size=settings.stt_model_size,
        device=settings.stt_device,
        compute_type=settings.stt_compute_type,
        beam_size=settings.stt_beam_size,
        vad_filter=settings.stt_vad_filter,
    )


def get_stt_engine() -> SttEngine:
    return _engine()


def get_attempt_repository() -> PronunciationAttemptRepository:
    """Override in tests to capture saved attempts."""
    return SupabasePronunciationAttemptRepository()


def _thresholds() -> ScoreThresholds:
    return ScoreThresholds(
        excellent=settings.pron_excellent_threshold,
        passed=settings.pron_passed_threshold,
    )


def get_check_pronunciation_use_case(
    stt: SttEngine = Depends(get_stt_engine),
    attempts_repo: PronunciationAttemptRepository = Depends(get_attempt_repository),
) -> CheckPronunciationUseCase:
    return CheckPronunciationUseCase(
        stt=stt, thresholds=_thresholds(), attempts_repo=attempts_repo
    )
