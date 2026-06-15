"""Unit tests for the STT adapter's pure helpers.

These don't load any model or import faster_whisper (that import is lazy,
inside the engine's methods), so they run free and fast in CI.
"""
from dataclasses import dataclass

from app.modules.speaking.infrastructure.faster_whisper_engine import (
    segments_to_text,
    whisper_language,
)


@dataclass
class _FakeSegment:
    text: str


class TestWhisperLanguage:
    def test_known_languages_map_to_iso_code(self):
        assert whisper_language("en") == "en"
        assert whisper_language("es") == "es"
        assert whisper_language("ru") == "ru"

    def test_region_suffix_is_stripped(self):
        assert whisper_language("en-US") == "en"
        assert whisper_language("es-MX") == "es"

    def test_case_insensitive(self):
        assert whisper_language("ES") == "es"

    def test_unknown_returns_none_for_autodetect(self):
        assert whisper_language("de") is None
        assert whisper_language("") is None


class TestSegmentsToText:
    def test_joins_and_trims_segments(self):
        segs = [_FakeSegment("  Hola "), _FakeSegment("mundo ")]
        assert segments_to_text(segs) == "Hola mundo"

    def test_no_segments_is_empty_string(self):
        # VAD filtered everything → silence → E5 downstream.
        assert segments_to_text([]) == ""

    def test_skips_blank_segments(self):
        segs = [_FakeSegment("the"), _FakeSegment("   "), _FakeSegment("cat")]
        assert segments_to_text(segs) == "the cat"
