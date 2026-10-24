"""Supabase-backed `PronunciationAttemptRepository`.

Append-only: every scored attempt is an immutable INSERT (unlimited retries,
AC #7). Never stores raw audio — score + metadata only (v1 retention [OPEN #6]).
When Supabase isn't configured the shared client is a stub whose `insert` is a
no-op, so dev/CI keep working without a database.
"""
from typing import Any

from app.modules.speaking.domain.entities import PronunciationAttempt
from app.shared.infrastructure.supabase_client import supabase


class SupabasePronunciationAttemptRepository:
    _TABLE = "pronunciation_attempts"

    def save(self, attempt: PronunciationAttempt) -> None:
        score = attempt.score
        payload: dict[str, Any] = {
            "user_id": attempt.user_id,
            "exercise_id": str(attempt.exercise_id),
            "course_lang": attempt.course_lang,
            "task_type": attempt.task_type.value,
            "expected_text": attempt.expected_text,
            "recognized_text": attempt.recognized_text,
            "match_pct": score.match_pct,
            "status": score.status.value,
            "words_matched": score.details.words_matched,
            "order_score": score.details.order_score,
            "missing": list(score.details.missing),
            "extra": list(score.details.extra),
            "attempt_no": attempt.attempt_no,
        }
        supabase.table(self._TABLE).insert(payload).execute()
