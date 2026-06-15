"""Speaking / pronunciation HTTP endpoints (Epic: Pronunciation Check v1).

    POST /api/v1/pronunciation/check   (multipart; Depends(current_user))  # PRON-5

Scoring is server-authoritative: the client sends audio, never a "result".
The ≤5 s latency budget (E3) and the concurrency cap live here — `transcribe`
is synchronous/CPU-bound, so it runs in a threadpool under `asyncio.wait_for`,
gated by a semaphore so parallel recognitions can't blow the latency guardrail.
"""
import asyncio
import time

from fastapi import APIRouter, Depends, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from app.config import settings
from app.modules.identity.domain.entities import AuthenticatedUser
from app.modules.identity.presentation.dependencies import current_user
from app.modules.speaking.application.dtos import CheckPronunciationCommand
from app.modules.speaking.application.use_cases import CheckPronunciationUseCase
from app.modules.speaking.domain.value_objects import TaskType
from app.modules.speaking.infrastructure import analytics
from app.modules.speaking.presentation.dependencies import get_check_pronunciation_use_case
from app.shared.exceptions import ValidationError

router = APIRouter(tags=["speaking"])

# Lazily-bound semaphore (created on the running loop at first request) so we
# don't instantiate it at import time outside an event loop.
_semaphore: asyncio.Semaphore | None = None


def _stt_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(settings.stt_max_concurrency)
    return _semaphore


class MatchDetailsResponse(BaseModel):
    words_matched: int
    missing: list[str]
    extra: list[str]
    order_score: float


class CheckPronunciationResponse(BaseModel):
    recognized_text: str
    match_pct: int
    status: str
    details: MatchDetailsResponse
    latency_ms: int


@router.post("/api/v1/pronunciation/check", response_model=CheckPronunciationResponse)
async def check_pronunciation(
    audio_file: UploadFile,
    exercise_id: str = Form(...),
    expected_text: str = Form(...),
    course_lang: str = Form(...),
    task_type: TaskType = Form(TaskType.PHRASE),
    attempt_no: int = Form(1),
    user: AuthenticatedUser = Depends(current_user),
    use_case: CheckPronunciationUseCase = Depends(get_check_pronunciation_use_case),
) -> CheckPronunciationResponse:
    audio = await audio_file.read()
    # Size guard before any decoding — DoS / cost protection (PRON-3, [OPEN #4]).
    if not audio:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Empty audio upload.")
    if len(audio) > settings.max_audio_bytes:
        raise HTTPException(
            status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio exceeds {settings.max_audio_bytes} bytes.",
        )

    command = CheckPronunciationCommand(
        user_id=user.id,
        exercise_id=exercise_id,
        expected_text=expected_text,
        course_lang=course_lang,
        audio=audio,
        audio_format=audio_file.content_type or "application/octet-stream",
        task_type=task_type,
        attempt_no=attempt_no,
    )
    analytics.audio_submitted(
        exercise_id=exercise_id,
        file_size_bytes=len(audio),
        audio_format=command.audio_format,
    )

    loop = asyncio.get_running_loop()
    started = time.perf_counter()
    try:
        async with _stt_semaphore():
            attempt = await asyncio.wait_for(
                loop.run_in_executor(None, use_case.execute, command),
                timeout=settings.stt_timeout_seconds,
            )
    except TimeoutError:
        # E3: do not fail the lesson — surface a retryable error.
        analytics.stt_failed(reason="timeout")
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Recognition timed out, please try again.",
        ) from None
    except ValidationError as exc:
        # Bad audio / empty expected text — client problem.
        analytics.stt_failed(reason="error")
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    latency_ms = int((time.perf_counter() - started) * 1000)
    score = attempt.score
    if attempt.recognized_text:
        analytics.stt_completed(
            latency_ms=latency_ms,
            model=settings.stt_model_size,
            recognized_len=len(attempt.recognized_text.split()),
        )
    else:
        # E2/E5: nothing intelligible heard — still scored (retry), but flagged.
        analytics.stt_failed(reason="no_speech")
    analytics.pronunciation_scored(
        match_pct=score.match_pct,
        status=score.status.value,
        attempt_no=attempt_no,
    )
    return CheckPronunciationResponse(
        recognized_text=attempt.recognized_text,
        match_pct=score.match_pct,
        status=score.status.value,
        details=MatchDetailsResponse(
            words_matched=score.details.words_matched,
            missing=list(score.details.missing),
            extra=list(score.details.extra),
            order_score=score.details.order_score,
        ),
        latency_ms=latency_ms,
    )
