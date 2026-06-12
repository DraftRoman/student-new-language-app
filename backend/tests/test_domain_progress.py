from datetime import datetime, timedelta

import pytest

from app.modules.progress.domain.services import SpacedRepetition
from app.modules.progress.domain.value_objects import Mastery
from app.shared.exceptions import ValidationError


class TestMastery:
    def test_constructs_within_range(self):
        assert Mastery(0).level == 0
        assert Mastery(5).level == 5

    def test_rejects_below_min(self):
        with pytest.raises(ValidationError):
            Mastery(-1)

    def test_rejects_above_max(self):
        with pytest.raises(ValidationError):
            Mastery(6)

    def test_adjust_clamps_at_zero(self):
        assert Mastery(0).adjusted(-1).level == 0

    def test_adjust_clamps_at_five(self):
        assert Mastery(5).adjusted(+1).level == 5

    def test_adjust_walks_in_range(self):
        assert Mastery(2).adjusted(+1).level == 3
        assert Mastery(2).adjusted(-1).level == 1

    def test_days_until_next_review_is_power_of_two(self):
        assert Mastery(0).days_until_next_review == 1
        assert Mastery(1).days_until_next_review == 2
        assert Mastery(2).days_until_next_review == 4
        assert Mastery(5).days_until_next_review == 32


class TestSpacedRepetition:
    def test_initial_correct_attempt_starts_at_mastery_1(self):
        p = SpacedRepetition.initial_sentence_progress("u", 42, correct=True)
        assert p.mastery.level == 1
        assert p.attempts == 1
        assert p.correct_count == 1

    def test_initial_wrong_attempt_starts_at_mastery_0(self):
        p = SpacedRepetition.initial_sentence_progress("u", 42, correct=False)
        assert p.mastery.level == 0
        assert p.correct_count == 0

    def test_correct_attempt_promotes_and_doubles_review(self):
        now = datetime(2026, 1, 1)
        p0 = SpacedRepetition.initial_sentence_progress("u", 42, correct=True, now=now)
        p1 = SpacedRepetition.apply_sentence_attempt(p0, correct=True, now=now)
        assert p1.mastery.level == 2
        # 2^2 = 4 days
        assert p1.next_review_at == now + timedelta(days=4)

    def test_wrong_attempt_demotes_and_shortens_review(self):
        now = datetime(2026, 1, 1)
        p0 = SpacedRepetition.initial_sentence_progress("u", 42, correct=True, now=now)
        p1 = SpacedRepetition.apply_sentence_attempt(p0, correct=False, now=now)
        assert p1.mastery.level == 0
        # 2^0 = 1 day
        assert p1.next_review_at == now + timedelta(days=1)
