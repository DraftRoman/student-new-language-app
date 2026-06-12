"""Placement-test domain entities.

Persistence-agnostic dataclasses; repositories in infrastructure/ map these
to JSON (test) or Supabase (prod). No DB ids leak into algorithm code —
`PlacementLadder.recommend()` consumes only `LevelAttempt`.
"""
from dataclasses import dataclass, field
from datetime import datetime

from app.modules.placement.domain.value_objects import CefrLevel, SessionStatus


@dataclass(frozen=True)
class LevelAttempt:
    """One CEFR level's outcome inside a placement session."""
    level: CefrLevel
    vocab_errors: int
    sentence_errors: int
    total_items: int
    passed: bool

    @property
    def total_errors(self) -> int:
        return self.vocab_errors + self.sentence_errors


@dataclass
class PlacementSession:
    """Aggregate for one user's placement run.

    Status transitions (story §6):
        in_progress  ──► completed  ──[user confirms]──► completed
                                                          + confirmed_level set
    `current_level` is the block to serve next while in_progress; cleared on
    completion. Use cases mutate this; the algorithm in services.py is pure
    and never touches a session directly.
    """
    id: str
    user_id: str
    status: SessionStatus
    current_level: CefrLevel | None
    started_at: datetime
    attempts: list[LevelAttempt] = field(default_factory=list)
    recommended_level: CefrLevel | None = None
    confirmed_level: CefrLevel | None = None
    completed_at: datetime | None = None

    @property
    def is_confirmed(self) -> bool:
        return self.confirmed_level is not None
