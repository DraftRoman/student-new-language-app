"""Pronunciation scoring — pure domain service, no I/O, no external libs.

Implements the server-authoritative comparison (UC-PRON-01 steps 6–8):
normalize → word-level alignment → match % → status. The match metric is
`1 − WER` (word error rate) computed with a word-level Levenshtein
alignment `[OPEN #2 — default]`; reordering is additionally surfaced via
`order_score` in the details payload.
"""
import re
import unicodedata
from collections import Counter

from app.modules.speaking.domain.value_objects import (
    MatchDetails,
    PronunciationScore,
    ScoreThresholds,
)
from app.shared.exceptions import ValidationError

# Strip everything that isn't a word char or whitespace (Unicode-aware, so
# Spanish/Russian letters and diacritics survive — those are phonemic).
_PUNCT_RE = re.compile(r"[^\w\s]", flags=re.UNICODE)


def normalize_tokens(text: str, language: str) -> list[str]:
    """Language-aware normalization → list of comparable word tokens.

    v1: NFC-normalize, lowercase, drop punctuation, collapse whitespace.
    Diacritics are kept (meaningful in es/ru). `language` is threaded through
    for future per-language rules (e.g. casing exceptions).
    TODO(PO): confirm per-language diacritic handling `[OPEN]`.
    """
    text = unicodedata.normalize("NFC", text)
    text = _PUNCT_RE.sub(" ", text)
    return text.lower().split()


def _alignment_matches(expected: list[str], recognized: list[str]) -> tuple[int, int]:
    """Word-level Levenshtein. Returns (edit_distance, ordered_matches).

    `ordered_matches` is the count of positions aligned as equal — words said
    correctly *and in order*. Used for both match % and `order_score`.
    """
    n, m = len(expected), len(recognized)
    # dp[i][j] = edit distance between expected[:i] and recognized[:j].
    dp = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(n + 1):
        dp[i][0] = i
    for j in range(m + 1):
        dp[0][j] = j
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            cost = 0 if expected[i - 1] == recognized[j - 1] else 1
            dp[i][j] = min(
                dp[i - 1][j] + 1,       # deletion
                dp[i][j - 1] + 1,       # insertion
                dp[i - 1][j - 1] + cost,  # substitution / match
            )

    # Backtrace to count equal alignments.
    matches = 0
    i, j = n, m
    while i > 0 and j > 0:
        if expected[i - 1] == recognized[j - 1] and dp[i][j] == dp[i - 1][j - 1]:
            matches += 1
            i, j = i - 1, j - 1
        elif dp[i][j] == dp[i - 1][j - 1] + 1:
            i, j = i - 1, j - 1  # substitution
        elif dp[i][j] == dp[i - 1][j] + 1:
            i -= 1  # deletion
        else:
            j -= 1  # insertion
    return dp[n][m], matches


class ScoringService:
    """Pure domain service — computes a score from two strings."""

    @staticmethod
    def score(
        expected_text: str,
        recognized_text: str,
        language: str,
        thresholds: ScoreThresholds | None = None,
    ) -> PronunciationScore:
        thresholds = thresholds or ScoreThresholds()

        expected = normalize_tokens(expected_text, language)
        if not expected:
            raise ValidationError("expected_text must contain at least one word")
        recognized = normalize_tokens(recognized_text, language)

        distance, ordered_matches = _alignment_matches(expected, recognized)

        # match % = 1 − WER, clamped to [0, 100].
        wer = distance / len(expected)
        match_pct = max(0, min(100, round((1 - wer) * 100)))

        # Order-independent multiset diffs: what the learner skipped / added.
        exp_counts, rec_counts = Counter(expected), Counter(recognized)
        missing = tuple(sorted((exp_counts - rec_counts).elements()))
        extra = tuple(sorted((rec_counts - exp_counts).elements()))

        # order_score: of the words actually present, how many landed in order.
        set_overlap = sum((exp_counts & rec_counts).values())
        order_score = round(ordered_matches / set_overlap, 2) if set_overlap else 0.0

        details = MatchDetails(
            words_matched=ordered_matches,
            missing=missing,
            extra=extra,
            order_score=order_score,
        )
        return PronunciationScore(
            match_pct=match_pct,
            status=thresholds.status_for(match_pct),
            details=details,
        )
