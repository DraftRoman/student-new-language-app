"""Placement-test pure domain services — no I/O.

Three cohesive pieces:
- `Scorer`        — counts errors for a single block (story §4.4, Q4).
- `ContentGapPolicy` — proportional fail-threshold when content is sparse (Q5).
- `PlacementLadder`  — climb rule, recommendation, +1 override cap (§4.2, Q1, Q2).

Everything is a staticmethod / classmethod over plain data so the highest-risk
logic stays trivially testable. All branches are exercised by
`backend/tests/test_placement_algorithm.py`.
"""
from collections.abc import Mapping, Sequence

from app.modules.placement.domain.entities import LevelAttempt
from app.modules.placement.domain.value_objects import (
    BASE_FAIL_THRESHOLD,
    BLOCK_SIZE_TOTAL,
    LEVEL_ORDER,
    CefrLevel,
    level_index,
)
from app.shared.exceptions import ValidationError


class Scorer:
    """Counts errors against an answer key. Pure functions only."""

    @staticmethod
    def score_vocab(answers: Mapping[str, str], key: Mapping[str, str]) -> int:
        """1 error per item where the user's answer doesn't match the key.

        Items in `key` missing from `answers` count as errors (unanswered ==
        wrong). Items in `answers` not in `key` are ignored — clients can send
        stale ids and the server stays authoritative on which items count.
        """
        errors = 0
        for item_id, correct in key.items():
            if answers.get(item_id) != correct:
                errors += 1
        return errors

    @staticmethod
    def score_sentence(
        answers: Mapping[str, Sequence[str]],
        key: Mapping[str, Sequence[str]],
    ) -> int:
        """Q4: full-match required. Right words, wrong order → 1 error."""
        errors = 0
        for item_id, correct_order in key.items():
            user_order = answers.get(item_id)
            if user_order is None or list(user_order) != list(correct_order):
                errors += 1
        return errors


class ContentGapPolicy:
    """Q5: scale the fail threshold when a level lacks the full 25 items.

    Returns the threshold X such that `errors < X` means passed. At a full
    25-item block X == BASE_FAIL_THRESHOLD (4). For a partial block we scale
    by the share of items present, never below 1 (otherwise a single error
    would always fail).
    """

    @staticmethod
    def fail_threshold_for(total_items: int) -> int:
        if total_items < 0:
            raise ValidationError(f"total_items must be >= 0, got {total_items}")
        if total_items >= BLOCK_SIZE_TOTAL:
            return BASE_FAIL_THRESHOLD
        if total_items == 0:
            return 0  # signal: nothing to score; PlacementLadder treats as passed
        # Round half away from zero so 12-item block ⇒ ceil(4 * 12/25) ≈ 2.
        scaled = round(BASE_FAIL_THRESHOLD * total_items / BLOCK_SIZE_TOTAL)
        return max(1, scaled)

    @staticmethod
    def passed(errors: int, total_items: int) -> bool:
        if total_items == 0:
            # Content gap with no items at all (Q5) → degrade gracefully: do
            # not fail the user on missing content; caller logs the warning.
            return True
        return errors < ContentGapPolicy.fail_threshold_for(total_items)


class PlacementLadder:
    """CEFR climb logic. Pure: input attempts, output the recommendation."""

    LEVELS = LEVEL_ORDER

    @staticmethod
    def next_after(level: CefrLevel) -> CefrLevel | None:
        """The level above `level`, or None if `level` is C2 (ceiling)."""
        idx = level_index(level)
        if idx + 1 >= len(LEVEL_ORDER):
            return None
        return LEVEL_ORDER[idx + 1]

    @staticmethod
    def recommend(attempts: Sequence[LevelAttempt]) -> CefrLevel:
        """Last passed level. Floor to A1 if A1 itself failed (Q1).

        The story (§4.2) says the test stops on the first failed level, so a
        well-formed `attempts` is a prefix of consecutive passes followed by
        at most one fail. We don't enforce that shape here — we just return
        the highest level whose attempt is `passed=True`, or A1 if none.
        """
        last_passed: CefrLevel | None = None
        for attempt in attempts:
            if attempt.passed:
                last_passed = attempt.level
        return last_passed if last_passed is not None else CefrLevel.A1

    @staticmethod
    def allowed_max(recommended: CefrLevel) -> CefrLevel:
        """Cap for the optional +1 override (§4.5).

        Returns `recommended + 1`, or `recommended` itself when recommended
        is C2 (ceiling — override disabled, Q2). UI reads this and disables
        the +1 control when allowed_max == recommended.
        """
        nxt = PlacementLadder.next_after(recommended)
        return nxt if nxt is not None else recommended

    @staticmethod
    def validate_choice(recommended: CefrLevel, chosen: CefrLevel) -> None:
        """Reject choices above the +1 cap or below the recommended level.

        The story permits accepting the recommendation or going one step up;
        it does NOT permit going below. We surface a domain ValidationError;
        the presentation layer maps it to 400.
        """
        allowed_max_idx = level_index(PlacementLadder.allowed_max(recommended))
        recommended_idx = level_index(recommended)
        chosen_idx = level_index(chosen)
        if chosen_idx < recommended_idx:
            raise ValidationError(
                f"chosen level {chosen.value} is below recommended {recommended.value}"
            )
        if chosen_idx > allowed_max_idx:
            raise ValidationError(
                f"chosen level {chosen.value} exceeds allowed max "
                f"{LEVEL_ORDER[allowed_max_idx].value}"
            )

    @staticmethod
    def is_complete(attempts: Sequence[LevelAttempt]) -> bool:
        """Test is complete after a fail OR after passing C2."""
        if not attempts:
            return False
        last = attempts[-1]
        if not last.passed:
            return True
        return PlacementLadder.next_after(last.level) is None
