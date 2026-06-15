"""Faster-Whisper adapter for the `SttEngine` port (T2.1).

Free / OSS, $0 per request: Faster-Whisper (MIT) running on CTranslate2, with
Silero-VAD for the no-speech short-circuit (E2). The model is loaded lazily and
cached per (size, device, compute_type) so the heavy weights load once, not per
request — call `warmup()` at startup to pay that cost before serving traffic and
stay inside the ≤5 s budget.

The latency timeout (E3) and the concurrency cap live at the endpoint (async),
not here: `transcribe` is a synchronous, CPU-bound call meant to be run in a
threadpool under `asyncio.wait_for`.
"""
import threading
from typing import Any

from app.modules.speaking.infrastructure.audio import decode_to_pcm

# Course language (may carry a region, e.g. "en-US") → Whisper ISO 639-1 code.
# Unknown → None, letting Whisper auto-detect rather than guessing wrong.
_WHISPER_LANG: dict[str, str] = {"en": "en", "es": "es", "ru": "ru"}

# Process-wide model cache, guarded so concurrent first-requests load once.
_model_cache: dict[tuple[str, str, str], Any] = {}
_cache_lock = threading.Lock()


def whisper_language(course_lang: str) -> str | None:
    """Map a course language to a Whisper language code (T2.2)."""
    base = course_lang.strip().lower().split("-")[0]
    return _WHISPER_LANG.get(base)


def segments_to_text(segments: Any) -> str:
    """Join recognized segments into one normalized line.

    Empty (silence filtered out by VAD → no segments) yields "", which the
    scoring layer treats as E5 (retry, motivational copy).
    """
    return " ".join(s.text.strip() for s in segments if s.text.strip()).strip()


class FasterWhisperEngine:
    """Concrete `SttEngine`. Satisfies the domain protocol structurally."""

    def __init__(
        self,
        model_size: str = "base",
        device: str = "cpu",
        compute_type: str = "int8",
        beam_size: int = 1,
        vad_filter: bool = True,
    ) -> None:
        self._model_size = model_size
        self._device = device
        self._compute_type = compute_type
        self._beam_size = beam_size
        self._vad_filter = vad_filter

    def _model(self) -> Any:
        key = (self._model_size, self._device, self._compute_type)
        with _cache_lock:
            if key not in _model_cache:
                from faster_whisper import WhisperModel

                _model_cache[key] = WhisperModel(
                    self._model_size,
                    device=self._device,
                    compute_type=self._compute_type,
                )
            return _model_cache[key]

    def warmup(self) -> None:
        """Force model load now (e.g. at app startup) instead of on first request."""
        self._model()

    def transcribe(self, audio: bytes, audio_format: str, language: str) -> str:
        samples = decode_to_pcm(audio, audio_format)
        segments, _info = self._model().transcribe(
            samples,
            language=whisper_language(language),
            beam_size=self._beam_size,
            vad_filter=self._vad_filter,
        )
        return segments_to_text(segments)
