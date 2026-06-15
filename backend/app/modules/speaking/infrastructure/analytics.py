"""Analytics events for the speaking feature (story §5).

Backend emits the events it has authoritative context for; the remaining
events (speaking_exercise_shown, mic_permission_*, recording_*,
speaking_exercise_completed) are client-owned (stories S1/S4).

Emitted via structlog so payloads are structured; testable with
`structlog.testing.capture_logs()`. No PII beyond the user-scoped request —
notably, never the audio or the recognized transcript text.
"""
import structlog

_log = structlog.get_logger("speaking")


def audio_submitted(*, exercise_id: str, file_size_bytes: int, audio_format: str) -> None:
    _log.info(
        "audio_submitted",
        exercise_id=exercise_id,
        file_size_bytes=file_size_bytes,
        format=audio_format,
    )


def stt_completed(*, latency_ms: int, model: str, recognized_len: int) -> None:
    _log.info(
        "stt_completed",
        latency_ms=latency_ms,
        model=model,
        recognized_len=recognized_len,
    )


def stt_failed(*, reason: str) -> None:
    """reason ∈ {timeout, error, no_speech}."""
    _log.info("stt_failed", reason=reason)


def pronunciation_scored(*, match_pct: int, status: str, attempt_no: int) -> None:
    _log.info(
        "pronunciation_scored",
        match_pct=match_pct,
        status=status,
        attempt_no=attempt_no,
    )
