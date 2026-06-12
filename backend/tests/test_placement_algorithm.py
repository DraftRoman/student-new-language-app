"""Exhaustive pure-domain tests for the placement-test algorithm.

The level-determination algorithm is the highest-risk piece of the feature
(story §7.1). Treat coverage here as defect-elimination, not formality —
every branch + every boundary listed in story §8 has its own test.
"""
import pytest

from app.modules.placement.domain.entities import LevelAttempt
from app.modules.placement.domain.services import (
    ContentGapPolicy,
    PlacementLadder,
    Scorer,
)
from app.modules.placement.domain.value_objects import (
    BASE_FAIL_THRESHOLD,
    BLOCK_SIZE_TOTAL,
    LEVEL_ORDER,
    CefrLevel,
)
from app.shared.exceptions import ValidationError


def _attempt(level: CefrLevel, errors: int, passed: bool) -> LevelAttempt:
    """Build a LevelAttempt for a full 25-item block — test helper."""
    return LevelAttempt(
        level=level,
        vocab_errors=errors,
        sentence_errors=0,
        total_items=BLOCK_SIZE_TOTAL,
        passed=passed,
    )


class TestScorerVocab:
    def test_all_correct_zero_errors(self):
        key = {"w1": "casa", "w2": "perro"}
        assert Scorer.score_vocab({"w1": "casa", "w2": "perro"}, key) == 0

    def test_each_wrong_answer_is_one_error(self):
        key = {"w1": "casa", "w2": "perro", "w3": "gato"}
        answers = {"w1": "casa", "w2": "WRONG", "w3": "WRONG"}
        assert Scorer.score_vocab(answers, key) == 2

    def test_missing_answer_counts_as_error(self):
        key = {"w1": "casa", "w2": "perro"}
        assert Scorer.score_vocab({"w1": "casa"}, key) == 1

    def test_extra_client_keys_ignored(self):
        """Server is authoritative: clients can send stale ids without skew."""
        key = {"w1": "casa"}
        answers = {"w1": "casa", "ghost": "junk"}
        assert Scorer.score_vocab(answers, key) == 0


class TestScorerSentence:
    def test_correct_order_zero_errors(self):
        key = {"s1": ["yo", "como", "manzanas"]}
        assert Scorer.score_sentence({"s1": ["yo", "como", "manzanas"]}, key) == 0

    def test_partial_word_order_is_one_error_q4(self):
        """Q4: right words, wrong order ⇒ 1 error, no partial credit."""
        key = {"s1": ["yo", "como", "manzanas"]}
        answers = {"s1": ["yo", "manzanas", "como"]}
        assert Scorer.score_sentence(answers, key) == 1

    def test_missing_sentence_is_one_error(self):
        key = {"s1": ["a", "b"], "s2": ["c", "d"]}
        assert Scorer.score_sentence({"s1": ["a", "b"]}, key) == 1


class TestContentGapPolicy:
    def test_full_block_uses_base_threshold(self):
        assert ContentGapPolicy.fail_threshold_for(BLOCK_SIZE_TOTAL) == BASE_FAIL_THRESHOLD

    def test_oversized_block_clamped_to_base_threshold(self):
        # Shouldn't happen in practice, but the policy must not over-scale.
        assert ContentGapPolicy.fail_threshold_for(BLOCK_SIZE_TOTAL + 10) == BASE_FAIL_THRESHOLD

    def test_proportional_scaling_q5(self):
        # 12-item block: round(4 * 12 / 25) = round(1.92) = 2.
        assert ContentGapPolicy.fail_threshold_for(12) == 2
        # 6-item block: round(4 * 6 / 25) = round(0.96) = 1.
        assert ContentGapPolicy.fail_threshold_for(6) == 1

    def test_threshold_never_below_one_for_nonempty_block(self):
        # 1-item block: scaled would round to 0; floor must lift it to 1.
        assert ContentGapPolicy.fail_threshold_for(1) == 1

    def test_zero_items_threshold_is_zero(self):
        # Sentinel: caller (PlacementLadder) treats this as auto-pass.
        assert ContentGapPolicy.fail_threshold_for(0) == 0

    def test_negative_items_rejected(self):
        with pytest.raises(ValidationError):
            ContentGapPolicy.fail_threshold_for(-1)

    def test_passed_with_zero_items_is_true_q5(self):
        """Q5: 'do not crash' — a totally empty block degrades to pass."""
        assert ContentGapPolicy.passed(errors=0, total_items=0) is True


class TestBoundary3vs4:
    """Story §8: 3 errors → pass; exactly 4 errors → fail. Off-by-one guard."""

    def test_three_errors_passes(self):
        assert ContentGapPolicy.passed(errors=3, total_items=BLOCK_SIZE_TOTAL) is True

    def test_exactly_four_errors_fails(self):
        assert ContentGapPolicy.passed(errors=4, total_items=BLOCK_SIZE_TOTAL) is False

    def test_five_errors_fails(self):
        assert ContentGapPolicy.passed(errors=5, total_items=BLOCK_SIZE_TOTAL) is False


class TestPlacementLadderNavigation:
    def test_next_after_walks_up(self):
        assert PlacementLadder.next_after(CefrLevel.A1) == CefrLevel.A2
        assert PlacementLadder.next_after(CefrLevel.B2) == CefrLevel.C1

    def test_next_after_c2_is_none(self):
        assert PlacementLadder.next_after(CefrLevel.C2) is None

    def test_levels_constant_matches_canonical_order(self):
        assert PlacementLadder.LEVELS == LEVEL_ORDER


class TestRecommendation:
    def test_worked_example_a1_a2_pass_b1_fail_recommends_a2(self):
        """Story §8 worked example."""
        attempts = [
            _attempt(CefrLevel.A1, errors=1, passed=True),
            _attempt(CefrLevel.A2, errors=2, passed=True),
            _attempt(CefrLevel.B1, errors=4, passed=False),
        ]
        assert PlacementLadder.recommend(attempts) == CefrLevel.A2

    def test_floor_a1_fail_recommends_a1_q1(self):
        attempts = [_attempt(CefrLevel.A1, errors=4, passed=False)]
        assert PlacementLadder.recommend(attempts) == CefrLevel.A1

    def test_floor_no_attempts_at_all_recommends_a1(self):
        # Defensive: server should never call recommend() with [], but if it
        # does, the floor (A1) is still the correct answer per Q1's spirit.
        assert PlacementLadder.recommend([]) == CefrLevel.A1

    def test_ceiling_full_pass_through_c2_recommends_c2_q2(self):
        attempts = [_attempt(lvl, errors=0, passed=True) for lvl in LEVEL_ORDER]
        assert PlacementLadder.recommend(attempts) == CefrLevel.C2

    def test_mid_ladder_pass_a1_a2_b1_b2_fail_c1_recommends_b2(self):
        attempts = [
            _attempt(CefrLevel.A1, errors=0, passed=True),
            _attempt(CefrLevel.A2, errors=1, passed=True),
            _attempt(CefrLevel.B1, errors=2, passed=True),
            _attempt(CefrLevel.B2, errors=3, passed=True),
            _attempt(CefrLevel.C1, errors=4, passed=False),
        ]
        assert PlacementLadder.recommend(attempts) == CefrLevel.B2


class TestAllowedMax:
    def test_allowed_max_is_recommended_plus_one(self):
        assert PlacementLadder.allowed_max(CefrLevel.A2) == CefrLevel.B1
        assert PlacementLadder.allowed_max(CefrLevel.B2) == CefrLevel.C1

    def test_allowed_max_at_c2_is_c2_override_disabled_q2(self):
        assert PlacementLadder.allowed_max(CefrLevel.C2) == CefrLevel.C2

    def test_allowed_max_at_a1_is_a2(self):
        assert PlacementLadder.allowed_max(CefrLevel.A1) == CefrLevel.A2


class TestValidateChoice:
    def test_accept_recommendation_is_valid(self):
        PlacementLadder.validate_choice(CefrLevel.A2, CefrLevel.A2)  # no raise

    def test_plus_one_step_is_valid(self):
        PlacementLadder.validate_choice(CefrLevel.A2, CefrLevel.B1)  # no raise

    def test_two_steps_above_rejected(self):
        with pytest.raises(ValidationError):
            PlacementLadder.validate_choice(CefrLevel.A2, CefrLevel.C1)

    def test_below_recommended_rejected(self):
        with pytest.raises(ValidationError):
            PlacementLadder.validate_choice(CefrLevel.B1, CefrLevel.A1)

    def test_at_c2_recommended_only_c2_accepted_q2(self):
        PlacementLadder.validate_choice(CefrLevel.C2, CefrLevel.C2)  # no raise
        with pytest.raises(ValidationError):
            # No level exists above C2; +1 disabled.
            PlacementLadder.validate_choice(CefrLevel.C2, CefrLevel.C1)


class TestIsComplete:
    def test_empty_not_complete(self):
        assert PlacementLadder.is_complete([]) is False

    def test_after_fail_complete(self):
        attempts = [_attempt(CefrLevel.A1, errors=4, passed=False)]
        assert PlacementLadder.is_complete(attempts) is True

    def test_after_pass_mid_ladder_not_complete(self):
        attempts = [_attempt(CefrLevel.A1, errors=0, passed=True)]
        assert PlacementLadder.is_complete(attempts) is False

    def test_after_pass_c2_complete(self):
        attempts = [_attempt(lvl, errors=0, passed=True) for lvl in LEVEL_ORDER]
        assert PlacementLadder.is_complete(attempts) is True


class TestContentGapEndToEnd:
    """Q5 integration: sparse content block scored + judged via the same policy."""

    def test_sparse_level_passes_below_scaled_threshold(self):
        # 10 items, threshold = round(4 * 10/25) = 2. 1 error < 2 → pass.
        assert ContentGapPolicy.passed(errors=1, total_items=10) is True

    def test_sparse_level_fails_at_scaled_threshold(self):
        # 10 items, threshold = 2. Exactly 2 errors → fail.
        assert ContentGapPolicy.passed(errors=2, total_items=10) is False
