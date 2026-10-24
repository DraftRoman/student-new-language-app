"""Ports (protocols) the speaking context depends on.

Concrete adapters live in `infrastructure/` and are wired in
`presentation/dependencies.py`. Keeping these as protocols lets tests swap a
fake STT engine via `app.dependency_overrides` (same pattern as identity/repos)
and lets the OSS engine be replaced (Faster-Whisper / Vosk / Coqui) without
touching the use case.
"""
from typing import Protocol

from app.modules.speaking.domain.entities import PronunciationAttempt


class SttEngine(Protocol):
    """Supporting actor: free/OSS speech-to-text. No paid-per-request APIs.

    Implementations own transcode (→16 kHz mono WAV), no-speech short-circuit
    (E2), and the ≤5 s latency budget / timeout (E3). Returns the recognized
    text, or "" when no intelligible speech was detected.
    """
    def transcribe(self, audio: bytes, audio_format: str, language: str) -> str: ...


class AudioStore(Protocol):
    """Transient audio handling. v1: retain only until scoring, then delete.

    Raw audio is never persisted in v1 `[OPEN #6 — default delete]`.
    """
    def save_temp(self, audio: bytes, audio_format: str) -> str: ...
    def delete(self, ref: str) -> None: ...


class PronunciationAttemptRepository(Protocol):
    """Persists scored-attempt metadata (no raw audio)."""
    def save(self, attempt: PronunciationAttempt) -> None: ...
