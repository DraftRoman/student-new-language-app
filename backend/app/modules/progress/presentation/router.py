from fastapi import APIRouter, Depends

from app.modules.identity.domain.entities import AuthenticatedUser
from app.modules.identity.presentation.dependencies import current_user
from app.modules.progress.application.dtos import (
    SaveSentenceProgressCommand,
    SaveWordProgressCommand,
)
from app.modules.progress.application.use_cases import (
    ListSentenceProgressUseCase,
    SaveSentenceProgressUseCase,
    SaveWordProgressUseCase,
)
from app.modules.progress.presentation.dependencies import (
    get_list_sentence_progress_use_case,
    get_save_sentence_progress_use_case,
    get_save_word_progress_use_case,
)

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.post("/sentence")
def save_sentence_progress(
    payload: SaveSentenceProgressCommand,
    user: AuthenticatedUser = Depends(current_user),
    use_case: SaveSentenceProgressUseCase = Depends(get_save_sentence_progress_use_case),
) -> dict:
    use_case.execute(
        user_id=user.id, exercise_id=payload.exercise_id, correct=payload.correct,
    )
    return {"success": True}


@router.get("/sentences")
def get_sentence_progress(
    user: AuthenticatedUser = Depends(current_user),
    use_case: ListSentenceProgressUseCase = Depends(get_list_sentence_progress_use_case),
) -> dict:
    return {"progress": use_case.execute(user_id=user.id)}


@router.post("/word")
def save_word_progress(
    payload: SaveWordProgressCommand,
    user: AuthenticatedUser = Depends(current_user),
    use_case: SaveWordProgressUseCase = Depends(get_save_word_progress_use_case),
) -> dict:
    use_case.execute(
        user_id=user.id,
        lemma=payload.lemma,
        language=payload.language,
        correct=payload.correct,
    )
    return {"success": True}
