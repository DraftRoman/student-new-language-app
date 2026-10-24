"""Server-side audio transcode (T2.3) — any inbound format → 16 kHz mono PCM.

Uses Faster-Whisper's bundled decoder (PyAV / ffmpeg libraries shipped inside
the `av` wheel), so there is **no system ffmpeg dependency** and nothing paid.
Handles browser WebM/Opus and mobile m4a/AAC alike. Decoding happens fully
in-memory — the raw audio is never written to disk (v1 retention: not
persisted `[OPEN #6]`).
"""
import io
from typing import TYPE_CHECKING

from app.shared.exceptions import ValidationError

if TYPE_CHECKING:
    import numpy as np

SAMPLE_RATE = 16_000


def decode_to_pcm(audio: bytes, audio_format: str) -> "np.ndarray":
    """Decode + resample to a float32 mono 16 kHz waveform.

    `audio_format` is informational (the decoder sniffs the container itself).
    Raises ValidationError on undecodable input so the endpoint can return 400
    rather than 500 — bad audio is a client problem, not a server fault.
    """
    from faster_whisper.audio import decode_audio

    try:
        return decode_audio(io.BytesIO(audio), sampling_rate=SAMPLE_RATE)
    except Exception as exc:  # noqa: BLE001 — any decode failure is a bad-input 400
        raise ValidationError(f"could not decode audio (format={audio_format})") from exc
