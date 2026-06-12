"""Integration tests for the JSON placement repositories.

These exercise the infrastructure adapters in isolation — round-trip,
file-not-found, status-based lookup, and content-source parsing of the
fixture in `tests/fixtures/placement/content.json`. They satisfy the
`PlacementSessionRepository` and `ContentSource` protocols structurally.
"""
from datetime import UTC, datetime
from pathlib import Path

import pytest

from app.modules.placement.domain.entities import LevelAttempt, PlacementSession
from app.modules.placement.domain.repositories import (
    ContentSource,
    PlacementSessionRepository,
)
from app.modules.placement.domain.value_objects import (
    CefrLevel,
    Construction,
    SessionStatus,
)
from app.modules.placement.infrastructure.json_content_source import JsonContentSource
from app.modules.placement.infrastructure.json_session_repository import (
    JsonPlacementSessionRepository,
)

FIXTURE_CONTENT = Path(__file__).parent / "fixtures" / "placement" / "content.json"


@pytest.fixture
def repo(tmp_path: Path) -> JsonPlacementSessionRepository:
    return JsonPlacementSessionRepository(tmp_path / "sessions.json")


@pytest.fixture
def content_source() -> JsonContentSource:
    return JsonContentSource(FIXTURE_CONTENT)


def _new_session(
    sid: str = "s1",
    user_id: str = "u1",
    status: SessionStatus = SessionStatus.IN_PROGRESS,
    current_level: CefrLevel | None = CefrLevel.A1,
) -> PlacementSession:
    return PlacementSession(
        id=sid,
        user_id=user_id,
        status=status,
        current_level=current_level,
        started_at=datetime(2026, 6, 1, 12, 0, tzinfo=UTC),
    )


class TestProtocolCompliance:
    """Structural-typing check: classes implement the domain protocols.

    No runtime registration required for `Protocol`, but asserting via
    isinstance over a small instance catches accidental signature drift.
    """

    def test_session_repository_satisfies_protocol(self, repo):
        assert isinstance(repo, PlacementSessionRepository)

    def test_content_source_satisfies_protocol(self, content_source):
        assert isinstance(content_source, ContentSource)


class TestSessionRoundTrip:
    def test_save_then_get_returns_equivalent_session(self, repo):
        session = _new_session()
        repo.save(session)
        loaded = repo.get("s1")
        assert loaded is not None
        assert loaded.id == session.id
        assert loaded.user_id == session.user_id
        assert loaded.status == SessionStatus.IN_PROGRESS
        assert loaded.current_level == CefrLevel.A1
        assert loaded.started_at == session.started_at
        assert loaded.attempts == []
        assert loaded.recommended_level is None
        assert loaded.confirmed_level is None

    def test_get_unknown_id_returns_none(self, repo):
        assert repo.get("does-not-exist") is None

    def test_round_trip_preserves_attempts_with_correct_levels(self, repo):
        session = _new_session()
        session.attempts = [
            LevelAttempt(CefrLevel.A1, 1, 0, 25, True),
            LevelAttempt(CefrLevel.A2, 2, 1, 25, True),
            LevelAttempt(CefrLevel.B1, 3, 1, 25, False),
        ]
        repo.save(session)
        loaded = repo.get("s1")
        assert loaded is not None
        assert loaded.attempts == session.attempts
        # Sanity: enums survived JSON.
        assert loaded.attempts[0].level == CefrLevel.A1
        assert loaded.attempts[-1].passed is False

    def test_round_trip_preserves_recommended_and_confirmed_levels(self, repo):
        session = _new_session(status=SessionStatus.COMPLETED, current_level=None)
        session.recommended_level = CefrLevel.A2
        session.confirmed_level = CefrLevel.B1
        session.completed_at = datetime(2026, 6, 1, 12, 30, tzinfo=UTC)
        repo.save(session)
        loaded = repo.get("s1")
        assert loaded is not None
        assert loaded.recommended_level == CefrLevel.A2
        assert loaded.confirmed_level == CefrLevel.B1
        assert loaded.completed_at == session.completed_at
        assert loaded.is_confirmed is True


class TestSaveIdempotency:
    def test_repeated_save_of_same_session_does_not_duplicate(self, repo):
        session = _new_session()
        repo.save(session)
        repo.save(session)
        repo.save(session)
        loaded = repo.get("s1")
        assert loaded is not None
        # Internal: file holds exactly one session row.
        import json
        data = json.loads(repo._path.read_text())  # noqa: SLF001 — test introspection
        assert len(data["sessions"]) == 1

    def test_save_overwrites_existing_session_id(self, repo):
        session = _new_session()
        repo.save(session)
        session.current_level = CefrLevel.A2
        session.attempts = [LevelAttempt(CefrLevel.A1, 0, 0, 25, True)]
        repo.save(session)
        loaded = repo.get("s1")
        assert loaded is not None
        assert loaded.current_level == CefrLevel.A2
        assert len(loaded.attempts) == 1


class TestGetActiveForUser:
    def test_returns_in_progress_session(self, repo):
        repo.save(_new_session(sid="s1", user_id="u1"))
        active = repo.get_active_for_user("u1")
        assert active is not None
        assert active.id == "s1"

    def test_ignores_completed_sessions(self, repo):
        repo.save(
            _new_session(
                sid="s1",
                user_id="u1",
                status=SessionStatus.COMPLETED,
                current_level=None,
            )
        )
        assert repo.get_active_for_user("u1") is None

    def test_returns_none_when_no_session_for_user(self, repo):
        repo.save(_new_session(sid="s1", user_id="u1"))
        assert repo.get_active_for_user("other-user") is None

    def test_isolates_users(self, repo):
        repo.save(_new_session(sid="s1", user_id="u1"))
        repo.save(_new_session(sid="s2", user_id="u2"))
        a1 = repo.get_active_for_user("u1")
        a2 = repo.get_active_for_user("u2")
        assert a1 is not None and a1.id == "s1"
        assert a2 is not None and a2.id == "s2"


class TestFileLifecycle:
    def test_get_on_missing_file_returns_none(self, tmp_path: Path):
        # Repo constructed against a path that doesn't exist yet — must not
        # crash; behaves as if the store is empty.
        repo = JsonPlacementSessionRepository(tmp_path / "nope" / "sessions.json")
        assert repo.get("anything") is None
        assert repo.get_active_for_user("u1") is None

    def test_first_save_creates_parent_dir_and_file(self, tmp_path: Path):
        target = tmp_path / "deep" / "nested" / "sessions.json"
        repo = JsonPlacementSessionRepository(target)
        repo.save(_new_session())
        assert target.exists()


class TestJsonContentSource:
    def test_loads_full_a1_vocab_block(self, content_source):
        items = content_source.vocab_for(CefrLevel.A1)
        # Fixture promises a full 20-item A1 block — used by happy-path
        # integration tests in step 3.
        assert len(items) == 20
        assert items[0].id == "a1-v01"
        assert items[0].question == "house"
        assert items[0].answer == "casa"

    def test_loads_a1_sentences_block(self, content_source):
        items = content_source.sentences_for(CefrLevel.A1)
        assert len(items) == 5
        first = items[0]
        assert first.construction == Construction.AFFIRMATIVE
        assert first.correct_order == ("yo", "como", "manzanas")
        # `elements` may be a different order from `correct_order` — that's
        # exactly the user's task.
        assert sorted(first.elements) == sorted(first.correct_order)

    def test_loads_sparse_higher_levels_for_q5_coverage(self, content_source):
        # A2..C2 ship with 5+1 to exercise ContentGapPolicy.
        for level in (
            CefrLevel.A2,
            CefrLevel.B1,
            CefrLevel.B2,
            CefrLevel.C1,
            CefrLevel.C2,
        ):
            vocab = content_source.vocab_for(level)
            sentences = content_source.sentences_for(level)
            assert len(vocab) >= 1, f"{level.value} has no vocab"
            assert len(sentences) >= 1, f"{level.value} has no sentences"

    def test_missing_level_returns_empty_lists(self, tmp_path: Path):
        # Build a fixture that only has A1; A2 must degrade to empty.
        path = tmp_path / "partial.json"
        path.write_text('{"A1": {"vocab": [], "sentences": []}}')
        src = JsonContentSource(path)
        assert src.vocab_for(CefrLevel.A2) == []
        assert src.sentences_for(CefrLevel.A2) == []

    def test_construction_enum_parsed_for_each_kind(self, tmp_path: Path):
        # Confirm all three constructions round-trip via the parser.
        path = tmp_path / "constructions.json"
        path.write_text(
            '{"A1": {"vocab": [], "sentences": ['
            '{"id":"s1","construction":"affirmative","elements":["a"],"correct_order":["a"]},'
            '{"id":"s2","construction":"interrogative","elements":["b"],"correct_order":["b"]},'
            '{"id":"s3","construction":"negative","elements":["c"],"correct_order":["c"]}'
            "]}}"
        )
        sentences = JsonContentSource(path).sentences_for(CefrLevel.A1)
        assert [s.construction for s in sentences] == [
            Construction.AFFIRMATIVE,
            Construction.INTERROGATIVE,
            Construction.NEGATIVE,
        ]
