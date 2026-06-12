"""Placement-test HTTP endpoints (story §6).

Routes:
  POST /api/onboarding/prior-experience
  GET  /api/placement/{session_id}/level/{level}/block
  POST /api/placement/{session_id}/level/{level}/answers
  GET  /api/placement/{session_id}/result
  POST /api/placement/{session_id}/confirm

All routes require a Bearer token via `current_user`. Domain errors are
mapped to HTTP status codes here; use cases stay HTTP-agnostic.
"""
from fastapi import APIRouter, Depends, HTTPException, status

from app.modules.identity.domain.entities import AuthenticatedUser
from app.modules.identity.presentation.dependencies import current_user
from app.modules.placement.application.dtos import (
    ConfirmLevelCommand,
    PriorExperienceCommand,
    SubmitLevelAnswersCommand,
)
from app.modules.placement.application.use_cases import (
    AnswerPriorExperienceUseCase,
    ConfirmLevelUseCase,
    GetLevelBlockUseCase,
    GetResultUseCase,
    SubmitLevelAnswersUseCase,
)
from app.modules.placement.domain.value_objects import CefrLevel
from app.modules.placement.presentation.dependencies import (
    get_answer_prior_experience_use_case,
    get_confirm_level_use_case,
    get_level_block_use_case,
    get_result_use_case,
    get_submit_level_answers_use_case,
)
from app.shared.exceptions import NotFoundError, ValidationError

router = APIRouter(tags=["placement"])


def _raise_for_domain(exc: Exception) -> None:
    """Translate a domain exception to an HTTPException. Reraises others."""
    if isinstance(exc, NotFoundError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    if isinstance(exc, ValidationError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    raise exc


@router.post("/api/onboarding/prior-experience")
def answer_prior_experience(
    payload: PriorExperienceCommand,
    user: AuthenticatedUser = Depends(current_user),
    use_case: AnswerPriorExperienceUseCase = Depends(get_answer_prior_experience_use_case),
) -> dict:
    try:
        return use_case.execute(user_id=user.id, studied_before=payload.studied_before)
    except (NotFoundError, ValidationError) as exc:
        _raise_for_domain(exc)
        raise  # pragma: no cover — _raise_for_domain always raises


@router.get("/api/placement/{session_id}/level/{level}/block")
def get_level_block(
    session_id: str,
    level: CefrLevel,
    user: AuthenticatedUser = Depends(current_user),
    use_case: GetLevelBlockUseCase = Depends(get_level_block_use_case),
) -> dict:
    try:
        return use_case.execute(user_id=user.id, session_id=session_id, level=level)
    except (NotFoundError, ValidationError) as exc:
        _raise_for_domain(exc)
        raise  # pragma: no cover


@router.post("/api/placement/{session_id}/level/{level}/answers")
def submit_level_answers(
    session_id: str,
    level: CefrLevel,
    payload: SubmitLevelAnswersCommand,
    user: AuthenticatedUser = Depends(current_user),
    use_case: SubmitLevelAnswersUseCase = Depends(get_submit_level_answers_use_case),
) -> dict:
    try:
        return use_case.execute(
            user_id=user.id, session_id=session_id, level=level, command=payload,
        )
    except (NotFoundError, ValidationError) as exc:
        _raise_for_domain(exc)
        raise  # pragma: no cover


@router.get("/api/placement/{session_id}/result")
def get_result(
    session_id: str,
    user: AuthenticatedUser = Depends(current_user),
    use_case: GetResultUseCase = Depends(get_result_use_case),
) -> dict:
    try:
        return use_case.execute(user_id=user.id, session_id=session_id)
    except (NotFoundError, ValidationError) as exc:
        _raise_for_domain(exc)
        raise  # pragma: no cover


@router.post("/api/placement/{session_id}/confirm")
def confirm_level(
    session_id: str,
    payload: ConfirmLevelCommand,
    user: AuthenticatedUser = Depends(current_user),
    use_case: ConfirmLevelUseCase = Depends(get_confirm_level_use_case),
) -> dict:
    try:
        return use_case.execute(
            user_id=user.id, session_id=session_id, chosen_level=payload.chosen_level,
        )
    except (NotFoundError, ValidationError) as exc:
        _raise_for_domain(exc)
        raise  # pragma: no cover
