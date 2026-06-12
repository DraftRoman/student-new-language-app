"""Placement-test application use cases.

Each use case orchestrates the domain (PlacementLadder / Scorer /
ContentGapPolicy) and the persistence protocols. No HTTP, no FastAPI.

Two cross-cutting decisions baked in here:

1. **Server-authoritative scoring (§4.4).** The client submits answers; the
   answer key never leaves the server. SubmitLevelAnswersUseCase pulls the
   key from the ContentSource on every call, so a client cannot influence
   the error count by sending a stale or doctored key.
2. **Idempotency on level submit (§5.1).** A double-submit returns the
   already-recorded attempt's outcome instead of re-scoring against a
   freshly-served block — replays don't double-count or accidentally fail
   a level that was already passed.
"""
import logging
from collections.abc import Callable
from datetime import UTC, datetime
from uuid import uuid4

from app.modules.placement.application.dtos import SubmitLevelAnswersCommand
from app.modules.placement.domain.entities import LevelAttempt, PlacementSession
from app.modules.placement.domain.repositories import (
    ContentSource,
    PlacementSessionRepository,
)
from app.modules.placement.domain.services import (
    ContentGapPolicy,
    PlacementLadder,
    Scorer,
)
from app.modules.placement.domain.value_objects import (
    BLOCK_SIZE_TOTAL,
    CefrLevel,
    SentenceItem,
    SessionStatus,
    VocabItem,
)
from app.shared.exceptions import NotFoundError, ValidationError

logger = logging.getLogger(__name__)

Clock = Callable[[], datetime]
IdFactory = Callable[[], str]


def _default_clock() -> datetime:
    return datetime.now(UTC)


def _default_id_factory() -> str:
    return str(uuid4())


class AnswerPriorExperienceUseCase:
    """Story §4.1 gate.

    `studied_before=False` → return the A1 fast-path payload; no session.
    `studied_before=True`  → return (or reuse) the user's in-progress
    session and the first block to serve. Reuse means the resume case
    (§5.1) doesn't silently start a fresh session and lose prior progress.
    """

    def __init__(
        self,
        session_repo: PlacementSessionRepository,
        content: ContentSource,
        clock: Clock = _default_clock,
        id_factory: IdFactory = _default_id_factory,
    ) -> None:
        self._sessions = session_repo
        self._content = content
        self._clock = clock
        self._new_id = id_factory

    def execute(self, user_id: str, studied_before: bool) -> dict:
        if not studied_before:
            return {"level": CefrLevel.A1.value, "test_required": False}

        active = self._sessions.get_active_for_user(user_id)
        if active is None:
            active = PlacementSession(
                id=self._new_id(),
                user_id=user_id,
                status=SessionStatus.IN_PROGRESS,
                current_level=CefrLevel.A1,
                started_at=self._clock(),
            )
            self._sessions.save(active)

        block = _serialize_block(active.current_level, self._content) if active.current_level else None
        return {
            "session_id": active.id,
            "test_required": True,
            "current_level": active.current_level.value if active.current_level else None,
            "block": block,
        }


class GetLevelBlockUseCase:
    """Returns the items for `level` inside `session_id`.

    Guards: session must exist, must belong to `user_id`, must be
    `in_progress`, and the requested level must match `current_level`.
    Refusing future or past levels prevents a client from sampling the
    next level's content to score it client-side, which would defeat
    server-authoritative scoring.
    """

    def __init__(self, session_repo: PlacementSessionRepository, content: ContentSource) -> None:
        self._sessions = session_repo
        self._content = content

    def execute(self, user_id: str, session_id: str, level: CefrLevel) -> dict:
        session = _load_owned_session(self._sessions, session_id, user_id)
        if session.status is not SessionStatus.IN_PROGRESS:
            raise ValidationError("placement session is already complete")
        if session.current_level != level:
            raise ValidationError(
                f"requested level {level.value} does not match current level "
                f"{session.current_level.value if session.current_level else 'none'}"
            )
        return _serialize_block(level, self._content)


class SubmitLevelAnswersUseCase:
    """Score the submitted answers against the server-held key, record the
    attempt, and advance the session.

    Idempotent: a replay of the same level returns the prior outcome.
    """

    def __init__(
        self,
        session_repo: PlacementSessionRepository,
        content: ContentSource,
        clock: Clock = _default_clock,
    ) -> None:
        self._sessions = session_repo
        self._content = content
        self._clock = clock

    def execute(
        self,
        user_id: str,
        session_id: str,
        level: CefrLevel,
        command: SubmitLevelAnswersCommand,
    ) -> dict:
        session = _load_owned_session(self._sessions, session_id, user_id)

        prior = _find_attempt(session, level)
        if prior is not None:
            return _attempt_response(session, prior)

        if session.status is not SessionStatus.IN_PROGRESS:
            raise ValidationError("placement session is already complete")
        if session.current_level != level:
            raise ValidationError(
                f"cannot submit level {level.value}; current level is "
                f"{session.current_level.value if session.current_level else 'none'}"
            )

        vocab_items = self._content.vocab_for(level)
        sentence_items = self._content.sentences_for(level)
        total_items = len(vocab_items) + len(sentence_items)

        # Q5: keep the user moving when a level is under-populated, but
        # leave a breadcrumb for the content team. Emitting once per
        # under-served submission is loud enough — these are real content
        # gaps, not noise.
        if total_items < BLOCK_SIZE_TOTAL:
            logger.warning(
                "placement: content gap at %s — only %d/%d items available",
                level.value, total_items, BLOCK_SIZE_TOTAL,
            )

        vocab_errors = Scorer.score_vocab(
            command.vocab, {v.id: v.answer for v in vocab_items},
        )
        sentence_errors = Scorer.score_sentence(
            command.sentence, {s.id: list(s.correct_order) for s in sentence_items},
        )
        total_errors = vocab_errors + sentence_errors
        passed = ContentGapPolicy.passed(total_errors, total_items)

        attempt = LevelAttempt(
            level=level,
            vocab_errors=vocab_errors,
            sentence_errors=sentence_errors,
            total_items=total_items,
            passed=passed,
        )
        session.attempts.append(attempt)

        if passed:
            nxt = PlacementLadder.next_after(level)
            if nxt is None:  # ceiling — passed C2
                _complete(session, self._clock())
            else:
                session.current_level = nxt
        else:
            _complete(session, self._clock())

        self._sessions.save(session)
        return _attempt_response(session, attempt)


class GetResultUseCase:
    """Returns the recommendation and the +1 ceiling for the confirm screen.

    Available only after the test completes (last fail OR C2 pass). Calling
    earlier surfaces a ValidationError so the client doesn't render a
    half-formed confirmation screen.
    """

    def __init__(self, session_repo: PlacementSessionRepository) -> None:
        self._sessions = session_repo

    def execute(self, user_id: str, session_id: str) -> dict:
        session = _load_owned_session(self._sessions, session_id, user_id)
        if session.recommended_level is None:
            raise ValidationError("placement test is not complete yet")
        recommended = session.recommended_level
        allowed_max = PlacementLadder.allowed_max(recommended)
        return {
            "recommended_level": recommended.value,
            "allowed_max_level": allowed_max.value,
            "confirmed_level": session.confirmed_level.value if session.confirmed_level else None,
        }


class ConfirmLevelUseCase:
    """Persist the user's confirmed level (§4.5 / §4.6).

    Re-confirming the same level is a no-op (idempotent); attempting to
    change it after confirmation raises ValidationError — the entry path is
    closed once confirmed (§5.6).
    """

    def __init__(self, session_repo: PlacementSessionRepository) -> None:
        self._sessions = session_repo

    def execute(self, user_id: str, session_id: str, chosen_level: CefrLevel) -> dict:
        session = _load_owned_session(self._sessions, session_id, user_id)
        if session.recommended_level is None:
            raise ValidationError("placement test is not complete yet")
        if session.confirmed_level is not None and session.confirmed_level != chosen_level:
            raise ValidationError("placement level is already confirmed")

        PlacementLadder.validate_choice(session.recommended_level, chosen_level)
        session.confirmed_level = chosen_level
        self._sessions.save(session)
        return {"confirmed_level": chosen_level.value}


# --- helpers --------------------------------------------------------------

def _load_owned_session(
    sessions: PlacementSessionRepository, session_id: str, user_id: str,
) -> PlacementSession:
    session = sessions.get(session_id)
    if session is None:
        raise NotFoundError(f"placement session {session_id} not found")
    if session.user_id != user_id:
        # Surface as not-found rather than forbidden — leaks no info about
        # the existence of other users' sessions.
        raise NotFoundError(f"placement session {session_id} not found")
    return session


def _find_attempt(session: PlacementSession, level: CefrLevel) -> LevelAttempt | None:
    for a in session.attempts:
        if a.level == level:
            return a
    return None


def _complete(session: PlacementSession, now: datetime) -> None:
    session.recommended_level = PlacementLadder.recommend(session.attempts)
    session.status = SessionStatus.COMPLETED
    session.current_level = None
    session.completed_at = now


def _attempt_response(session: PlacementSession, attempt: LevelAttempt) -> dict:
    next_level: str | None = None
    if session.status is SessionStatus.IN_PROGRESS and session.current_level is not None:
        next_level = session.current_level.value
    return {
        "level": attempt.level.value,
        "errors": attempt.total_errors,
        "passed": attempt.passed,
        "next_level": next_level,
        "recommended_level": (
            session.recommended_level.value if session.recommended_level else None
        ),
    }


def _serialize_vocab(items: list[VocabItem]) -> list[dict]:
    return [{"id": i.id, "question": i.question, "answer": i.answer} for i in items]


def _serialize_sentences(items: list[SentenceItem]) -> list[dict]:
    return [
        {
            "id": i.id,
            "construction": i.construction.value,
            "elements": list(i.elements),
            "correct_order": list(i.correct_order),
        }
        for i in items
    ]


def _serialize_block(level: CefrLevel, content: ContentSource) -> dict:
    """Serialize a level's block for the wire.

    NOTE: the response includes `correct_order` and vocab `answer`s. The
    server scores authoritatively, so the wire cost is information leakage,
    not a scoring exploit. For production we may want a "render-only"
    projection that strips the keys; for now this matches the existing
    catalog router shape (which also exposes full sentence data).
    """
    vocab = content.vocab_for(level)
    sentences = content.sentences_for(level)
    return {
        "level": level.value,
        "vocab": _serialize_vocab(vocab),
        "sentence": _serialize_sentences(sentences),
        "vocab_page_size": 5,
        "total_items": len(vocab) + len(sentences),
    }
