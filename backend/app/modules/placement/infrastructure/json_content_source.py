"""File-backed `ContentSource` for test and dev.

Reads a JSON fixture with the shape:

    {
      "A1": {
        "vocab":     [{"id": "...", "question": "...", "answer": "..."}, ...],
        "sentences": [
          {"id": "...", "construction": "affirmative",
           "elements": ["...", ...], "correct_order": ["...", ...]}, ...
        ]
      },
      "A2": {...}, ...
    }

Missing levels resolve to empty lists — the algorithm's ContentGapPolicy
already handles sparse blocks (story Q5).
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from app.modules.placement.domain.value_objects import (
    CefrLevel,
    Construction,
    SentenceItem,
    VocabItem,
)


class JsonContentSource:
    """File-backed CEFR content. Satisfies `ContentSource`.

    The file is loaded eagerly at construction time; tests can swap the
    underlying file by constructing a new instance. For a long-running dev
    process you'd add a reload hook — not needed for test runs.
    """

    def __init__(self, path: Path) -> None:
        self._path = path
        self._data: dict[str, dict[str, Any]] = json.loads(
            path.read_text(encoding="utf-8")
        )

    def vocab_for(self, level: CefrLevel) -> list[VocabItem]:
        raws = self._data.get(level.value, {}).get("vocab", [])
        return [
            VocabItem(id=r["id"], question=r["question"], answer=r["answer"])
            for r in raws
        ]

    def sentences_for(self, level: CefrLevel) -> list[SentenceItem]:
        raws = self._data.get(level.value, {}).get("sentences", [])
        return [
            SentenceItem(
                id=r["id"],
                construction=Construction(r["construction"]),
                elements=tuple(r["elements"]),
                correct_order=tuple(r["correct_order"]),
            )
            for r in raws
        ]
