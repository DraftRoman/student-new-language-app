"""File-backed `PlacementSessionRepository` for test and dev environments.

The repo stores all sessions in a single JSON file using the shape:

    { "sessions": { "<session_id>": {...session payload...} } }

Atomicity: each save reads the whole file, mutates the in-memory dict, and
writes via a temp file + `Path.replace()` (POSIX-atomic rename). Adequate
for single-process test/dev; for concurrent multi-worker production we
swap in the Supabase implementation.
"""
from __future__ import annotations

import json
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any

from app.modules.placement.domain.entities import LevelAttempt, PlacementSession
from app.modules.placement.domain.value_objects import CefrLevel, SessionStatus


def _serialize_session(session: PlacementSession) -> dict[str, Any]:
    raw = asdict(session)
    raw["status"] = session.status.value
    raw["current_level"] = session.current_level.value if session.current_level else None
    raw["recommended_level"] = (
        session.recommended_level.value if session.recommended_level else None
    )
    raw["confirmed_level"] = (
        session.confirmed_level.value if session.confirmed_level else None
    )
    raw["started_at"] = session.started_at.isoformat()
    raw["completed_at"] = (
        session.completed_at.isoformat() if session.completed_at else None
    )
    raw["attempts"] = [
        {**asdict(a), "level": a.level.value} for a in session.attempts
    ]
    return raw


def _deserialize_attempt(raw: dict[str, Any]) -> LevelAttempt:
    return LevelAttempt(
        level=CefrLevel(raw["level"]),
        vocab_errors=raw["vocab_errors"],
        sentence_errors=raw["sentence_errors"],
        total_items=raw["total_items"],
        passed=raw["passed"],
    )


def _deserialize_session(raw: dict[str, Any]) -> PlacementSession:
    return PlacementSession(
        id=raw["id"],
        user_id=raw["user_id"],
        status=SessionStatus(raw["status"]),
        current_level=CefrLevel(raw["current_level"]) if raw["current_level"] else None,
        started_at=datetime.fromisoformat(raw["started_at"]),
        attempts=[_deserialize_attempt(a) for a in raw.get("attempts", [])],
        recommended_level=(
            CefrLevel(raw["recommended_level"]) if raw["recommended_level"] else None
        ),
        confirmed_level=(
            CefrLevel(raw["confirmed_level"]) if raw["confirmed_level"] else None
        ),
        completed_at=(
            datetime.fromisoformat(raw["completed_at"]) if raw["completed_at"] else None
        ),
    )


class JsonPlacementSessionRepository:
    """File-backed sessions store. Satisfies `PlacementSessionRepository`."""

    def __init__(self, path: Path) -> None:
        self._path = path

    def _load(self) -> dict[str, Any]:
        if not self._path.exists():
            return {"sessions": {}}
        return json.loads(self._path.read_text(encoding="utf-8"))

    def _write_atomic(self, data: dict[str, Any]) -> None:
        self._path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self._path.with_suffix(self._path.suffix + ".tmp")
        tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        tmp.replace(self._path)

    def get(self, session_id: str) -> PlacementSession | None:
        data = self._load()
        raw = data["sessions"].get(session_id)
        return _deserialize_session(raw) if raw else None

    def get_active_for_user(self, user_id: str) -> PlacementSession | None:
        data = self._load()
        for raw in data["sessions"].values():
            if (
                raw["user_id"] == user_id
                and raw["status"] == SessionStatus.IN_PROGRESS.value
            ):
                return _deserialize_session(raw)
        return None

    def save(self, session: PlacementSession) -> None:
        data = self._load()
        data["sessions"][session.id] = _serialize_session(session)
        self._write_atomic(data)
