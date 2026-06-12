"""Supabase-backed `PlacementSessionRepository`.

Tables (see [backend/migrations/001_placement_tables.sql](../../../../migrations/001_placement_tables.sql)):
- `placement_session`        — one row per run; aggregate root.
- `placement_level_attempt`  — one row per level the user attempted, in order.

Persistence strategy:

- **Save is INSERT-or-UPDATE on the session row** (UPSERT semantics by id).
  Supabase-py's PostgREST client doesn't expose a single "upsert by primary
  key" helper across versions, so we use the explicit existence-check +
  insert / update flow that the rest of the codebase already uses
  ([SupabaseSentenceProgressRepository](../../progress/infrastructure/supabase_repositories.py)).

- **Attempts are INSERT-only.** Each attempt is immutable once recorded.
  A `UNIQUE (session_id, cefr_level)` constraint at the DB level mirrors
  the in-app idempotency check (story §5.1: replay a level → same outcome),
  so two racing requests cannot both create a row for the same level.

- **No deletes anywhere.** Sessions are never deleted by the app — a
  failed test stays as `completed`, and the next placement run for the
  same user is currently a story §5.6 constraint ("test is one-time,
  onboarding-only"). If we later add a "retake" flow, that will be a new
  insert + a status field, never a delete.
"""
from datetime import datetime
from typing import Any

from app.modules.placement.domain.entities import LevelAttempt, PlacementSession
from app.modules.placement.domain.value_objects import CefrLevel, SessionStatus
from app.shared.infrastructure.supabase_client import supabase

SESSION_TABLE = "placement_session"
ATTEMPT_TABLE = "placement_level_attempt"


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _session_payload(session: PlacementSession) -> dict[str, Any]:
    """Row payload for placement_session — no `id` (Supabase fills on insert,
    we match on it on update)."""
    return {
        "user_id":           session.user_id,
        "status":            session.status.value,
        "current_level":     session.current_level.value if session.current_level else None,
        "recommended_level": session.recommended_level.value if session.recommended_level else None,
        "confirmed_level":   session.confirmed_level.value if session.confirmed_level else None,
        "started_at":        session.started_at.isoformat(),
        "completed_at":      session.completed_at.isoformat() if session.completed_at else None,
    }


def _hydrate_session(row: dict[str, Any], attempts: list[LevelAttempt]) -> PlacementSession:
    started = _parse_dt(row["started_at"])
    if started is None:  # pragma: no cover — DB column is NOT NULL
        raise ValueError(f"placement_session.started_at is required (id={row.get('id')})")
    return PlacementSession(
        id=row["id"],
        user_id=row["user_id"],
        status=SessionStatus(row["status"]),
        current_level=CefrLevel(row["current_level"]) if row.get("current_level") else None,
        started_at=started,
        attempts=attempts,
        recommended_level=CefrLevel(row["recommended_level"]) if row.get("recommended_level") else None,
        confirmed_level=CefrLevel(row["confirmed_level"]) if row.get("confirmed_level") else None,
        completed_at=_parse_dt(row.get("completed_at")),
    )


def _hydrate_attempts(rows: list[dict[str, Any]]) -> list[LevelAttempt]:
    # Preserve attempt order — the recommend() algorithm expects the
    # climb sequence A1 → A2 → … . `attempted_at` reflects it, but order
    # may already be guaranteed by `id` (BIGSERIAL); we sort on both for
    # safety.
    rows = sorted(rows, key=lambda r: (r.get("attempted_at") or "", r.get("id") or 0))
    return [
        LevelAttempt(
            level=CefrLevel(r["cefr_level"]),
            vocab_errors=r["vocab_errors"],
            sentence_errors=r["sentence_errors"],
            total_items=r["total_items"],
            passed=r["passed"],
        )
        for r in rows
    ]


class SupabasePlacementSessionRepository:
    """Satisfies the `PlacementSessionRepository` protocol."""

    def _fetch_attempts(self, session_id: str) -> list[LevelAttempt]:
        res = (
            supabase.table(ATTEMPT_TABLE)
            .select("id, cefr_level, vocab_errors, sentence_errors, total_items, passed, attempted_at")
            .eq("session_id", session_id)
            .execute()
        )
        return _hydrate_attempts(res.data or [])

    def _fetch_session_row(self, session_id: str) -> dict[str, Any] | None:
        res = (
            supabase.table(SESSION_TABLE)
            .select("id, user_id, status, current_level, recommended_level, "
                    "confirmed_level, started_at, completed_at")
            .eq("id", session_id)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        return rows[0] if rows else None

    def get(self, session_id: str) -> PlacementSession | None:
        row = self._fetch_session_row(session_id)
        if row is None:
            return None
        attempts = self._fetch_attempts(row["id"])
        return _hydrate_session(row, attempts)

    def get_active_for_user(self, user_id: str) -> PlacementSession | None:
        res = (
            supabase.table(SESSION_TABLE)
            .select("id, user_id, status, current_level, recommended_level, "
                    "confirmed_level, started_at, completed_at")
            .eq("user_id", user_id)
            .eq("status", SessionStatus.IN_PROGRESS.value)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        if not rows:
            return None
        attempts = self._fetch_attempts(rows[0]["id"])
        return _hydrate_session(rows[0], attempts)

    def save(self, session: PlacementSession) -> None:
        """Upsert the session row + insert any new attempts.

        Two-step rather than a single transactional call: the supabase-py
        client doesn't expose multi-statement transactions, but the at-most-
        once guard on attempts (`UNIQUE (session_id, cefr_level)`) keeps
        a retry of `save()` safe — duplicate inserts surface as a constraint
        violation rather than silently double-counting.
        """
        existing = self._fetch_session_row(session.id)
        payload = _session_payload(session)

        if existing is None:
            payload["id"] = session.id  # use our pre-generated UUID, not Postgres's default
            supabase.table(SESSION_TABLE).insert(payload).execute()
        else:
            supabase.table(SESSION_TABLE).update(payload).eq("id", session.id).execute()

        # Persist any attempts that aren't already stored. The application
        # layer appends one attempt per save() call, but inserting only the
        # missing tail keeps the impl resilient to in-memory replays.
        already_recorded = {a.level for a in _hydrate_attempts(
            (supabase.table(ATTEMPT_TABLE)
                .select("cefr_level")
                .eq("session_id", session.id)
                .execute()
             ).data or []
        )}
        new_rows: list[dict[str, Any]] = []
        for a in session.attempts:
            if a.level in already_recorded:
                continue
            new_rows.append({
                "session_id":      session.id,
                "cefr_level":      a.level.value,
                "vocab_errors":    a.vocab_errors,
                "sentence_errors": a.sentence_errors,
                "total_items":     a.total_items,
                "passed":          a.passed,
            })
        if new_rows:
            supabase.table(ATTEMPT_TABLE).insert(new_rows).execute()
