"""Pure unit tests for the speaking domain — no FastAPI, no Supabase, no STT."""
import pytest

from app.modules.speaking.domain.services import ScoringService, normalize_tokens
from app.modules.speaking.domain.value_objects import (
    PronunciationStatus,
    ScoreThresholds,
)
from app.shared.exceptions import ValidationError


class TestScoreThresholds:
    def test_defaults_are_source_story_values(self):
        t = ScoreThresholds()
        assert (t.excellent, t.passed) == (90, 75)

    def test_status_boundaries(self):
        t = ScoreThresholds()
        assert t.status_for(100) == PronunciationStatus.EXCELLENT
        assert t.status_for(90) == PronunciationStatus.EXCELLENT
        assert t.status_for(89) == PronunciationStatus.PASSED
        assert t.status_for(75) == PronunciationStatus.PASSED
        assert t.status_for(74) == PronunciationStatus.RETRY
        assert t.status_for(0) == PronunciationStatus.RETRY

    def test_custom_thresholds_are_honored(self):
        t = ScoreThresholds(excellent=80, passed=50)
        assert t.status_for(80) == PronunciationStatus.EXCELLENT
        assert t.status_for(50) == PronunciationStatus.PASSED
        assert t.status_for(49) == PronunciationStatus.RETRY

    def test_rejects_passed_above_excellent(self):
        with pytest.raises(ValidationError):
            ScoreThresholds(excellent=70, passed=90)

    def test_rejects_out_of_range(self):
        with pytest.raises(ValidationError):
            ScoreThresholds(excellent=120, passed=75)


class TestNormalizeTokens:
    def test_lowercases_and_strips_punctuation(self):
        assert normalize_tokens("Hola, mundo!", "es") == ["hola", "mundo"]

    def test_collapses_whitespace(self):
        assert normalize_tokens("  the   cat \n sat ", "en") == ["the", "cat", "sat"]

    def test_keeps_diacritics(self):
        # Accents are phonemic in es/ru — must not be stripped.
        assert normalize_tokens("¿Cómo estás?", "es") == ["cómo", "estás"]

    def test_empty_string_yields_no_tokens(self):
        assert normalize_tokens("   ", "en") == []


class TestScoringService:
    def test_perfect_match_is_100_excellent(self):
        s = ScoringService.score("the cat sat", "the cat sat", "en")
        assert s.match_pct == 100
        assert s.status == PronunciationStatus.EXCELLENT
        assert s.details.words_matched == 3
        assert s.details.missing == ()
        assert s.details.extra == ()
        assert s.details.order_score == 1.0

    def test_match_is_case_and_punctuation_insensitive(self):
        s = ScoringService.score("Hola, mundo!", "hola mundo", "es")
        assert s.match_pct == 100
        assert s.status == PronunciationStatus.EXCELLENT

    def test_single_substitution(self):
        # 1 wrong word of 3 → WER 1/3 → 67%.
        s = ScoringService.score("the cat sat", "the dog sat", "en")
        assert s.match_pct == 67
        assert s.status == PronunciationStatus.RETRY
        assert s.details.words_matched == 2
        assert s.details.missing == ("cat",)
        assert s.details.extra == ("dog",)

    def test_missing_word(self):
        s = ScoringService.score("the cat sat", "the sat", "en")
        assert s.match_pct == 67
        assert s.details.missing == ("cat",)
        assert s.details.extra == ()

    def test_extra_word(self):
        # 1 insertion over 2 expected → WER 1/2 → 50%.
        s = ScoringService.score("the cat", "the cat now", "en")
        assert s.match_pct == 50
        assert s.details.missing == ()
        assert s.details.extra == ("now",)

    def test_reordering_penalized_via_order_score_even_when_all_words_present(self):
        # All three words present (no missing/extra) but order is wrong.
        s = ScoringService.score("a b c", "a c b", "en")
        assert s.details.missing == ()
        assert s.details.extra == ()
        assert s.details.order_score < 1.0
        assert s.match_pct < 100

    def test_empty_recognition_is_zero_retry_e5(self):
        # E5: unintelligible/silence → treated as <75% retry, all words missing.
        s = ScoringService.score("the cat sat", "", "en")
        assert s.match_pct == 0
        assert s.status == PronunciationStatus.RETRY
        assert s.details.words_matched == 0
        assert s.details.missing == ("cat", "sat", "the")
        assert s.details.order_score == 0.0

    def test_single_word_task_perfect(self):
        s = ScoringService.score("gato", "Gato.", "es")
        assert s.match_pct == 100
        assert s.status == PronunciationStatus.EXCELLENT

    def test_empty_expected_text_is_rejected(self):
        with pytest.raises(ValidationError):
            ScoringService.score("   ", "anything", "en")

    def test_custom_thresholds_change_status_only(self):
        # 67% passes under a lenient 60 threshold.
        lenient = ScoreThresholds(excellent=90, passed=60)
        s = ScoringService.score("the cat sat", "the dog sat", "en", thresholds=lenient)
        assert s.match_pct == 67
        assert s.status == PronunciationStatus.PASSED
