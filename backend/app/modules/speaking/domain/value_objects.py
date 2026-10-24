from dataclasses import dataclass
from enum import Enum

from app.shared.exceptions import ValidationError

MATCH_MIN = 0
MATCH_MAX = 100

# Source-story defaults: >=90 excellent, 75-89 passed, <75 retry.
DEFAULT_EXCELLENT_THRESHOLD = 90
DEFAULT_PASSED_THRESHOLD = 75


class PronunciationStatus(str, Enum):
    """Outcome bucket for a pronunciation attempt (UC-PRON-01 step 8)."""
    EXCELLENT = "excellent"
    PASSED = "passed"
    RETRY = "retry"


class TaskType(str, Enum):
    """Input variance of the same use case (word vs phrase vs sentence).

    Same flow, different expected-text length and scoring tolerance.
    """
    WORD = "word"
    PHRASE = "phrase"
    SENTENCE = "sentence"


@dataclass(frozen=True)
class ScoreThresholds:
    """Configurable pass/fail cutoffs `[OPEN #3 — default 90/75]`.

    Invariant: 0 <= passed <= excellent <= 100. The thresholds are
    server-owned so the client cannot influence status mapping.
    """
    excellent: int = DEFAULT_EXCELLENT_THRESHOLD
    passed: int = DEFAULT_PASSED_THRESHOLD

    def __post_init__(self) -> None:
        if not (MATCH_MIN <= self.passed <= self.excellent <= MATCH_MAX):
            raise ValidationError(
                "thresholds must satisfy 0 <= passed <= excellent <= 100, "
                f"got passed={self.passed}, excellent={self.excellent}"
            )

    def status_for(self, match_pct: int) -> PronunciationStatus:
        if match_pct >= self.excellent:
            return PronunciationStatus.EXCELLENT
        if match_pct >= self.passed:
            return PronunciationStatus.PASSED
        return PronunciationStatus.RETRY


@dataclass(frozen=True)
class MatchDetails:
    """Transparency payload for the result UI and future word-level highlight.

    `missing` / `extra` are order-independent multiset differences (words the
    learner skipped / added). `order_score` (0–1) captures reordering even when
    every word is present, so the contract's `details` stays informative.
    """
    words_matched: int
    missing: tuple[str, ...]
    extra: tuple[str, ...]
    order_score: float


@dataclass(frozen=True)
class PronunciationScore:
    """Server-authoritative result of comparing recognized vs expected text."""
    match_pct: int
    status: PronunciationStatus
    details: MatchDetails

    def __post_init__(self) -> None:
        if not (MATCH_MIN <= self.match_pct <= MATCH_MAX):
            raise ValidationError(
                f"match_pct must be between {MATCH_MIN} and {MATCH_MAX}, got {self.match_pct}"
            )
