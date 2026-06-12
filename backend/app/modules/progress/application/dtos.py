from pydantic import BaseModel


class SaveSentenceProgressCommand(BaseModel):
    exercise_id: int | str
    correct: bool


class SaveWordProgressCommand(BaseModel):
    lemma: str
    language: str = "en-es"
    correct: bool
