from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "TurtleTalk API"
    supabase_url: str
    supabase_service_key: str
    cors_origins: list[str] = ["http://localhost:5173"]
    storage_bucket: str = "imagesTurtle"

    # Placement session storage backend.
    #   auto     — Supabase if credentials look real, JSON otherwise.
    #              Default; matches the existing behavior, no surprises.
    #   json     — force the file-backed dev store, even if Supabase is
    #              configured. Useful as a kill-switch if the placement
    #              tables aren't migrated yet but the rest of the app
    #              still needs the running Supabase client.
    #   supabase — force Supabase. Crashes loudly on the first request
    #              if credentials aren't real — surfaces misconfiguration
    #              instead of silently writing JSON files in production.
    placement_backend: Literal["auto", "json", "supabase"] = "auto"

    # --- Speaking / pronunciation STT (free / OSS only — no paid-per-request API) ---
    # Faster-Whisper (MIT) on CTranslate2. int8 on CPU is the fast, free default;
    # greedy decoding (beam=1) keeps us inside the ≤5 s latency budget [SOURCE].
    stt_model_size: str = "base"          # tiny/base/small/medium [OPEN #5 — revisit per language]
    stt_device: str = "cpu"               # "cuda" if a GPU is available
    stt_compute_type: str = "int8"        # int8 (CPU) / float16 (GPU)
    stt_beam_size: int = 1                # greedy = fastest
    stt_vad_filter: bool = True           # Silero-VAD: drops silence, short-circuits no-speech (E2)
    stt_timeout_seconds: float = 5.0      # E3 — enforced at the endpoint [SOURCE ≤5 s]
    stt_max_concurrency: int = 2          # cap parallel STT to protect latency guardrail
    stt_warmup_on_startup: bool = False   # prod: True (load weights before serving). Off by default so dev/CI stay offline.

    # Audio limits enforced before any decoding (DoS / cost guard) [OPEN #4 — 15 s / ~1 MB].
    max_audio_bytes: int = 1_048_576      # ~1 MB
    max_audio_seconds: int = 15

    # Status thresholds [OPEN #3 — source defaults 90 / 75; configurable].
    pron_excellent_threshold: int = 90
    pron_passed_threshold: int = 75

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def storage_base(self) -> str:
        return f"{self.supabase_url}/storage/v1/object/public"


settings = Settings()  # type: ignore[call-arg]
