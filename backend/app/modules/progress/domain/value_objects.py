from dataclasses import dataclass

from app.shared.exceptions import ValidationError

MASTERY_MIN = 0
MASTERY_MAX = 5


@dataclass(frozen=True)
class Mastery:
    """Mastery level on a 0–5 spaced-repetition scale.

    Invariant: 0 <= level <= 5. Constructing out-of-range raises
    ValidationError; use `.adjusted(delta)` to bump safely (clamps).
    """
    level: int

    def __post_init__(self) -> None:
        if not (MASTERY_MIN <= self.level <= MASTERY_MAX):
            raise ValidationError(
                f"mastery must be between {MASTERY_MIN} and {MASTERY_MAX}, got {self.level}"
            )

    def adjusted(self, delta: int) -> "Mastery":
        return Mastery(max(MASTERY_MIN, min(MASTERY_MAX, self.level + delta)))

    @property
    def days_until_next_review(self) -> int:
        """2^level days, per the project's spaced-repetition rule."""
        return 2 ** self.level
