"""FastAPI Depends factories for the placement context.

Session repository: prefers Supabase when real credentials are present
(`supabase_client._is_configured()` is True); otherwise falls back to the
file-backed JSON store so dev / CI keeps working without network access.
The runtime decision is made *once* at first resolution and cached.

Content source: still file-backed. Mapping the existing `dictionary` /
`sentences` tables onto the placement `VocabItem` / `SentenceItem` shape
needs CEFR-level + construction-type product decisions the placement
story doesn't lock down. Until that mapping is settled, JSON content is
the source of truth — the protocol is unchanged so swapping in a
Supabase content source later is one factory replacement.

Tests bypass all of this via `app.dependency_overrides`.
"""
from functools import lru_cache
from pathlib import Path

from fastapi import Depends

from app.config import settings
from app.modules.placement.application.use_cases import (
    AnswerPriorExperienceUseCase,
    ConfirmLevelUseCase,
    GetLevelBlockUseCase,
    GetResultUseCase,
    SubmitLevelAnswersUseCase,
)
from app.modules.placement.domain.repositories import (
    ContentSource,
    PlacementSessionRepository,
)
from app.modules.placement.infrastructure.json_content_source import JsonContentSource
from app.modules.placement.infrastructure.json_session_repository import (
    JsonPlacementSessionRepository,
)
from app.modules.placement.infrastructure.supabase_session_repository import (
    SupabasePlacementSessionRepository,
)
from app.shared.infrastructure.supabase_client import _is_configured

# Anchor relative paths at the backend package root so behavior doesn't
# depend on the process's cwd. tests/fixtures/placement/content.json is the
# canonical seed; production deployments override the paths via env vars
# (or replace the factories outright with Supabase-backed ones).
_BACKEND_ROOT = Path(__file__).resolve().parents[4]
_DEFAULT_CONTENT_PATH = _BACKEND_ROOT / "tests" / "fixtures" / "placement" / "content.json"
_DEFAULT_SESSIONS_PATH = _BACKEND_ROOT / "data" / "placement_sessions.json"


@lru_cache(maxsize=1)
def _content_source() -> JsonContentSource:
    return JsonContentSource(_DEFAULT_CONTENT_PATH)


def _resolve_backend(backend: str, configured: bool) -> str:
    """Pure resolver — testable without env or Supabase reachability.

    Returns the concrete backend ("json" | "supabase") given the
    `placement_backend` setting and whether Supabase credentials look real.
    "auto" follows credentials; "json" / "supabase" force the choice.
    """
    if backend == "json":
        return "json"
    if backend == "supabase":
        return "supabase"
    # "auto": pick what the environment supports.
    return "supabase" if configured else "json"


@lru_cache(maxsize=1)
def _session_repo() -> PlacementSessionRepository:
    # Resolved once per process at first request; restart the backend
    # after flipping PLACEMENT_BACKEND in the environment.
    backend = _resolve_backend(settings.placement_backend, _is_configured())
    if backend == "supabase":
        return SupabasePlacementSessionRepository()
    return JsonPlacementSessionRepository(_DEFAULT_SESSIONS_PATH)


def get_content_source() -> ContentSource:
    return _content_source()


def get_session_repository() -> PlacementSessionRepository:
    return _session_repo()


def get_answer_prior_experience_use_case(
    sessions: PlacementSessionRepository = Depends(get_session_repository),
    content: ContentSource = Depends(get_content_source),
) -> AnswerPriorExperienceUseCase:
    return AnswerPriorExperienceUseCase(sessions, content)


def get_level_block_use_case(
    sessions: PlacementSessionRepository = Depends(get_session_repository),
    content: ContentSource = Depends(get_content_source),
) -> GetLevelBlockUseCase:
    return GetLevelBlockUseCase(sessions, content)


def get_submit_level_answers_use_case(
    sessions: PlacementSessionRepository = Depends(get_session_repository),
    content: ContentSource = Depends(get_content_source),
) -> SubmitLevelAnswersUseCase:
    return SubmitLevelAnswersUseCase(sessions, content)


def get_result_use_case(
    sessions: PlacementSessionRepository = Depends(get_session_repository),
) -> GetResultUseCase:
    return GetResultUseCase(sessions)


def get_confirm_level_use_case(
    sessions: PlacementSessionRepository = Depends(get_session_repository),
) -> ConfirmLevelUseCase:
    return ConfirmLevelUseCase(sessions)
