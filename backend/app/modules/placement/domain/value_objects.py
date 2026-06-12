"""Placement-test value objects and ladder constants.

Source of truth for the CEFR ladder, block sizes, and the fail threshold.
All math that consumes these lives in `services.py`; no I/O here.
"""
from dataclasses import dataclass
from enum import Enum

from app.shared.exceptions import ValidationError


class CefrLevel(str, Enum):
    A1 = "A1"
    A2 = "A2"
    B1 = "B1"
    B2 = "B2"
    C1 = "C1"
    C2 = "C2"


# Canonical climb order. Ladder logic in services.py reads only this tuple,
# never enum member iteration, so reordering Enum members can't break the test.
LEVEL_ORDER: tuple[CefrLevel, ...] = (
    CefrLevel.A1,
    CefrLevel.A2,
    CefrLevel.B1,
    CefrLevel.B2,
    CefrLevel.C1,
    CefrLevel.C2,
)


class Construction(str, Enum):
    """Sentence-builder construction (story §4.3)."""
    AFFIRMATIVE = "affirmative"
    INTERROGATIVE = "interrogative"
    NEGATIVE = "negative"


# Per story §4.3 / §4.4. A full block at any level is 20 vocab + 5 sentences.
BLOCK_VOCAB_COUNT = 20
BLOCK_SENTENCE_COUNT = 5
BLOCK_SIZE_TOTAL = BLOCK_VOCAB_COUNT + BLOCK_SENTENCE_COUNT  # 25

# "Lightweight" non-negotiable: client renders at most 5 vocab pairs at once.
VOCAB_ITEMS_PER_PAGE = 5

# Story §4.4: errors >= 4 → fail at a full 25-item block.
BASE_FAIL_THRESHOLD = 4


def level_index(level: CefrLevel) -> int:
    try:
        return LEVEL_ORDER.index(level)
    except ValueError as exc:  # pragma: no cover — Enum guarantees membership
        raise ValidationError(f"unknown CEFR level: {level!r}") from exc


class SessionStatus(str, Enum):
    """Lifecycle of a placement session, per story §6.

    `in_progress` — climbing the ladder; `current_level` points at the next block.
    `completed`   — recommendation finalized; awaiting `/confirm` to set
                    `confirmed_level`. A confirmed session stays `completed`
                    (story uses 2 statuses); presence of `confirmed_level`
                    distinguishes done from awaiting-confirm.
    """
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


@dataclass(frozen=True)
class VocabItem:
    """One vocab-matching task served inside a level block (story §4.3)."""
    id: str
    question: str
    answer: str


@dataclass(frozen=True)
class SentenceItem:
    """One sentence-building task: user reorders `elements` to match
    `correct_order`. `construction` exists for analytics/curriculum coverage
    (the scorer only checks order, per Q4)."""
    id: str
    construction: Construction
    elements: tuple[str, ...]
    correct_order: tuple[str, ...]
