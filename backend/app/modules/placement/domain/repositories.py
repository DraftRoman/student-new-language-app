"""Placement-context repository and content-source protocols.

Domain owns the interfaces; concrete implementations live in
`infrastructure/` (JSON for test/dev, Supabase for prod). Use cases depend
on these protocols only.
"""
from typing import Protocol, runtime_checkable

from app.modules.placement.domain.entities import PlacementSession
from app.modules.placement.domain.value_objects import (
    CefrLevel,
    SentenceItem,
    VocabItem,
)


@runtime_checkable
class PlacementSessionRepository(Protocol):
    """Persistence boundary for placement sessions."""

    def get(self, session_id: str) -> PlacementSession | None: ...

    def get_active_for_user(self, user_id: str) -> PlacementSession | None:
        """Return the user's `in_progress` session, if any.

        Onboarding gate uses this to resume mid-test (story §5.1) and to
        prevent starting a second session while one is still open.
        """
        ...

    def save(self, session: PlacementSession) -> None:
        """Upsert by `session.id`. Implementation must be atomic at the
        file/row level — partial writes corrupt later loads."""
        ...


@runtime_checkable
class ContentSource(Protocol):
    """Source of vocab and sentence items per CEFR level.

    Story §2: questions are drawn **only** from existing platform content —
    no AI generation. Test-time impl reads a JSON fixture; production impl
    reads the platform's content store (Supabase).
    """

    def vocab_for(self, level: CefrLevel) -> list[VocabItem]: ...

    def sentences_for(self, level: CefrLevel) -> list[SentenceItem]: ...
