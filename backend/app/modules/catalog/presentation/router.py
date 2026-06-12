from fastapi import APIRouter, Depends, HTTPException, Query

from app.modules.catalog.application.use_cases import (
    GetWordMatchUseCase,
    ListSentencesUseCase,
)
from app.modules.catalog.presentation.dependencies import (
    get_list_sentences_use_case,
    get_word_match_use_case,
)
from app.shared.exceptions import NotFoundError, ValidationError

router = APIRouter(prefix="/api/game", tags=["catalog"])


@router.get("/sentences")
def get_sentences(
    level: str | None = Query(default=None),
    use_case: ListSentencesUseCase = Depends(get_list_sentences_use_case),
) -> dict:
    try:
        dtos = use_case.execute(level)
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"sentences": [d.__dict__ for d in dtos]}


@router.get("/wordmatch")
def get_wordmatch(
    language: str = Query(default="en-es"),
    limit: int = Query(default=5, ge=1, le=20),
    use_case: GetWordMatchUseCase = Depends(get_word_match_use_case),
) -> dict:
    try:
        result = use_case.execute(language, limit)
    except ValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except NotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return {
        "pairs": [p.__dict__ for p in result.pairs],
        "imageMode": result.image_mode.value if result.image_mode else None,
    }
