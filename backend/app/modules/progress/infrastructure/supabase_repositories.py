from datetime import datetime
from typing import Any

from app.modules.progress.domain.entities import SentenceProgress, WordProgress
from app.modules.progress.domain.value_objects import Mastery
from app.shared.infrastructure.supabase_client import supabase


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


class SupabaseSentenceProgressRepository:
    _TABLE = "user_progress"

    def find(self, user_id: str, exercise_id: int | str) -> SentenceProgress | None:
        res = (
            supabase.table(self._TABLE)
            .select("id, attempts, correct_count, mastery_level, "
                    "next_review_at, last_attempted_at")
            .eq("user_id", user_id)
            .eq("exercise_id", exercise_id)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        if not rows:
            return None
        row = rows[0]
        return SentenceProgress(
            id=row.get("id"),
            user_id=user_id,
            exercise_id=exercise_id,
            attempts=row["attempts"],
            correct_count=row["correct_count"],
            mastery=Mastery(row["mastery_level"]),
            next_review_at=_parse_dt(row.get("next_review_at")) or datetime.min,
            last_attempted_at=_parse_dt(row.get("last_attempted_at")) or datetime.min,
        )

    def save(self, progress: SentenceProgress) -> None:
        payload: dict[str, Any] = {
            "attempts": progress.attempts,
            "correct_count": progress.correct_count,
            "mastery_level": progress.mastery.level,
            "next_review_at": progress.next_review_at.isoformat(),
            "last_attempted_at": progress.last_attempted_at.isoformat(),
        }
        if progress.id is None:
            payload["user_id"] = progress.user_id
            payload["exercise_id"] = progress.exercise_id
            supabase.table(self._TABLE).insert(payload).execute()
        else:
            supabase.table(self._TABLE).update(payload).eq("id", progress.id).execute()

    def list_for_user(self, user_id: str) -> list[SentenceProgress]:
        res = (
            supabase.table(self._TABLE)
            .select("exercise_id, attempts, correct_count, "
                    "mastery_level, last_attempted_at, next_review_at")
            .eq("user_id", user_id)
            .execute()
        )
        rows = res.data or []
        out: list[SentenceProgress] = []
        for row in rows:
            out.append(SentenceProgress(
                user_id=user_id,
                exercise_id=row["exercise_id"],
                attempts=row["attempts"],
                correct_count=row["correct_count"],
                mastery=Mastery(row["mastery_level"]),
                next_review_at=_parse_dt(row.get("next_review_at")) or datetime.min,
                last_attempted_at=_parse_dt(row.get("last_attempted_at")) or datetime.min,
            ))
        return out


class SupabaseWordProgressRepository:
    _TABLE = "word_progress"

    def find(self, user_id: str, lemma: str, language: str) -> WordProgress | None:
        res = (
            supabase.table(self._TABLE)
            .select("id, attempts, correct_count")
            .eq("user_id", user_id)
            .eq("lemma", lemma)
            .eq("language", language)
            .limit(1)
            .execute()
        )
        rows = res.data or []
        if not rows:
            return None
        row = rows[0]
        return WordProgress(
            id=row.get("id"),
            user_id=user_id,
            lemma=lemma,
            language=language,
            attempts=row["attempts"],
            correct_count=row["correct_count"],
        )

    def save(self, progress: WordProgress) -> None:
        payload: dict[str, Any] = {
            "attempts": progress.attempts,
            "correct_count": progress.correct_count,
        }
        if progress.id is None:
            payload["user_id"] = progress.user_id
            payload["lemma"] = progress.lemma
            payload["language"] = progress.language
            supabase.table(self._TABLE).insert(payload).execute()
        else:
            supabase.table(self._TABLE).update(payload).eq("id", progress.id).execute()
