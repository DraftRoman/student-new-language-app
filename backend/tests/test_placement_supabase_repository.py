"""Unit tests for `SupabasePlacementSessionRepository`.

The repo is exercised against an in-memory `FakeSupabaseClient` that
mirrors the chainable shape of `supabase-py` (`.table().select().eq()...
.execute()`). Tests are unit-scoped: no network, no monkey-patching of
the module-level `supabase` singleton — we inject the fake via the
repo's optional `client` constructor argument.

The headline test is `test_resave_with_prior_attempt_does_not_crash`,
which reproduces the production KeyError that pinned the placement
flow at the second level: `save()` re-fetched attempts using a
`select("cefr_level")` projection and then tried to hydrate them as
full `LevelAttempt` rows. After the fix, `save()` collects already-
recorded levels directly from the projection — no hydration required.
"""
from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any

import pytest

from app.modules.placement.domain.entities import LevelAttempt, PlacementSession
from app.modules.placement.domain.repositories import PlacementSessionRepository
from app.modules.placement.domain.value_objects import CefrLevel, SessionStatus
from app.modules.placement.infrastructure.supabase_session_repository import (
    SupabasePlacementSessionRepository,
)

# --- Fake Supabase client ------------------------------------------------

class _Query:
    """In-memory simulacrum of one chained supabase-py table query."""

    def __init__(self, table_name: str, store: dict[str, list[dict[str, Any]]]) -> None:
        self._table = table_name
        self._store = store
        self._filters: list[tuple[str, Any]] = []
        self._limit: int | None = None
        self._op: str | None = None
        self._payload: dict | list | None = None

    def select(self, _cols: str) -> "_Query":
        self._op = "select"
        return self

    def eq(self, col: str, val: Any) -> "_Query":
        self._filters.append((col, val))
        return self

    def limit(self, n: int) -> "_Query":
        self._limit = n
        return self

    def insert(self, payload: dict | list) -> "_Query":
        self._op = "insert"
        self._payload = payload
        return self

    def update(self, payload: dict) -> "_Query":
        self._op = "update"
        self._payload = payload
        return self

    def execute(self) -> SimpleNamespace:
        rows = self._store[self._table]
        if self._op == "select":
            out = [r for r in rows if all(r.get(c) == v for c, v in self._filters)]
            if self._limit is not None:
                out = out[: self._limit]
            return SimpleNamespace(data=out)
        if self._op == "insert":
            payload = self._payload
            assert payload is not None
            if isinstance(payload, dict):
                payload = {**payload, "id": payload.get("id") or len(rows) + 1}
                rows.append(payload)
                return SimpleNamespace(data=[payload])
            assigned = []
            for p in payload:
                row = {**p, "id": p.get("id") or len(rows) + 1 + len(assigned)}
                rows.append(row)
                assigned.append(row)
            return SimpleNamespace(data=assigned)
        if self._op == "update":
            assert isinstance(self._payload, dict)
            matched = [r for r in rows if all(r.get(c) == v for c, v in self._filters)]
            for r in matched:
                r.update(self._payload)
            return SimpleNamespace(data=matched)
        raise AssertionError(f"unsupported op: {self._op}")


class FakeSupabaseClient:
    """Two-table stub matching the chainable supabase-py surface the repo uses."""

    def __init__(self) -> None:
        self.store: dict[str, list[dict[str, Any]]] = {
            "placement_session": [],
            "placement_level_attempt": [],
        }

    def table(self, name: str) -> _Query:
        return _Query(name, self.store)


# --- Fixtures ------------------------------------------------------------

@pytest.fixture
def client() -> FakeSupabaseClient:
    return FakeSupabaseClient()


@pytest.fixture
def repo(client: FakeSupabaseClient) -> SupabasePlacementSessionRepository:
    return SupabasePlacementSessionRepository(client=client)


def _new_session(
    sid: str = "11111111-1111-1111-1111-111111111111",
    user_id: str = "u-1",
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


# --- Tests ---------------------------------------------------------------

class TestProtocolCompliance:
    def test_satisfies_session_repository_protocol(self, repo):
        assert isinstance(repo, PlacementSessionRepository)


class TestSessionRoundTrip:
    def test_save_new_session_then_get_returns_equivalent(self, repo):
        session = _new_session()
        repo.save(session)

        loaded = repo.get(session.id)
        assert loaded is not None
        assert loaded.id == session.id
        assert loaded.user_id == session.user_id
        assert loaded.status == SessionStatus.IN_PROGRESS
        assert loaded.current_level == CefrLevel.A1
        assert loaded.started_at == session.started_at
        assert loaded.attempts == []

    def test_get_unknown_id_returns_none(self, repo):
        assert repo.get("missing") is None

    def test_save_persists_recommended_and_confirmed_levels(self, repo):
        session = _new_session(status=SessionStatus.COMPLETED, current_level=None)
        session.recommended_level = CefrLevel.A2
        session.confirmed_level = CefrLevel.B1
        session.completed_at = datetime(2026, 6, 1, 12, 30, tzinfo=UTC)
        repo.save(session)

        loaded = repo.get(session.id)
        assert loaded is not None
        assert loaded.recommended_level == CefrLevel.A2
        assert loaded.confirmed_level == CefrLevel.B1
        assert loaded.completed_at == session.completed_at


class TestSavePersistsAttempts:
    def test_first_save_inserts_all_attempts(self, repo, client):
        session = _new_session()
        session.attempts = [LevelAttempt(CefrLevel.A1, 0, 0, 25, True)]
        repo.save(session)

        rows = client.store["placement_level_attempt"]
        assert len(rows) == 1
        assert rows[0]["cefr_level"] == "A1"
        assert rows[0]["passed"] is True


class TestSaveWithPriorAttempts:
    """Regression: a second `save()` call where one attempt is already in the
    DB must not crash and must insert only the new attempts."""

    def test_resave_with_prior_attempt_does_not_crash(self, repo):
        session = _new_session()
        session.attempts = [LevelAttempt(CefrLevel.A1, 0, 0, 25, True)]
        repo.save(session)

        # Simulate the application-layer state right after the second
        # SubmitLevelAnswersUseCase: a fresh attempt has been appended in
        # memory, and we save again.
        session.attempts.append(LevelAttempt(CefrLevel.A2, 1, 0, 6, True))
        repo.save(session)  # used to raise KeyError('vocab_errors')

    def test_only_new_attempts_get_inserted_on_resave(self, repo, client):
        session = _new_session()
        session.attempts = [LevelAttempt(CefrLevel.A1, 0, 0, 25, True)]
        repo.save(session)

        session.attempts.append(LevelAttempt(CefrLevel.A2, 1, 0, 6, True))
        repo.save(session)

        rows = client.store["placement_level_attempt"]
        assert [r["cefr_level"] for r in rows] == ["A1", "A2"]

    def test_idempotent_resave_no_new_attempts_does_not_duplicate(self, repo, client):
        session = _new_session()
        session.attempts = [LevelAttempt(CefrLevel.A1, 0, 0, 25, True)]
        repo.save(session)
        repo.save(session)
        repo.save(session)

        rows = client.store["placement_level_attempt"]
        assert len(rows) == 1


class TestSessionRowLifecycle:
    def test_resave_updates_existing_session_row_in_place(self, repo, client):
        session = _new_session()
        repo.save(session)

        session.current_level = CefrLevel.A2
        repo.save(session)

        sessions = client.store["placement_session"]
        assert len(sessions) == 1
        assert sessions[0]["current_level"] == "A2"


class TestGetActiveForUser:
    def test_returns_in_progress_session(self, repo):
        repo.save(_new_session(user_id="alice"))
        active = repo.get_active_for_user("alice")
        assert active is not None
        assert active.user_id == "alice"

    def test_ignores_completed_sessions(self, repo):
        repo.save(_new_session(
            user_id="bob",
            status=SessionStatus.COMPLETED,
            current_level=None,
        ))
        assert repo.get_active_for_user("bob") is None

    def test_returns_none_when_no_session_for_user(self, repo):
        repo.save(_new_session(user_id="alice"))
        assert repo.get_active_for_user("carol") is None
