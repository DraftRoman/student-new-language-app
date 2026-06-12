"""Placement-test application DTOs.

Pydantic models on the boundary; pure-domain types stay free of pydantic so
they remain trivially unit-testable. Commands carry only what the user
submits — answers, the prior-experience choice, the confirmed level.
"""
from pydantic import BaseModel, Field

from app.modules.placement.domain.value_objects import CefrLevel


class PriorExperienceCommand(BaseModel):
    """POST /onboarding/prior-experience body (story §4.1)."""
    studied_before: bool


class SubmitLevelAnswersCommand(BaseModel):
    """POST /placement/{session_id}/level/{level}/answers body.

    `vocab` keys are VocabItem ids → user's chosen translation.
    `sentence` keys are SentenceItem ids → user's ordered elements.
    Both default to empty — a fully-skipped block scores as all errors,
    which is consistent with story §4.4 (each unanswered item counts).
    """
    vocab: dict[str, str] = Field(default_factory=dict)
    sentence: dict[str, list[str]] = Field(default_factory=dict)


class ConfirmLevelCommand(BaseModel):
    """POST /placement/{session_id}/confirm body (story §4.5)."""
    chosen_level: CefrLevel
