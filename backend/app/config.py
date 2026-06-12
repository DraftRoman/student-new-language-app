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

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def storage_base(self) -> str:
        return f"{self.supabase_url}/storage/v1/object/public"


settings = Settings()  # type: ignore[call-arg]
