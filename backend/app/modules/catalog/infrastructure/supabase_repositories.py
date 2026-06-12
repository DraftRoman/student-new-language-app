from app.config import settings
from app.modules.catalog.domain.entities import DictionaryEntry, Sentence
from app.modules.catalog.domain.value_objects import Translation
from app.shared.infrastructure.supabase_client import supabase


def _safe_index(items: list | None, idx: int) -> str | None:
    if not items or idx >= len(items):
        return None
    return items[idx]


class SupabaseSentenceRepository:
    def list_active(self, level: str | None = None) -> list[Sentence]:
        query = (
            supabase.table("sentences")
            .select(
                "id, level, words, dict_id, example_index, dictionary!dict_id(example)"
            )
            .eq("is_active", True)
        )
        if level:
            query = query.eq("level", level)
        res = query.execute()
        rows = res.data or []

        sentences: list[Sentence] = []
        for row in rows:
            example = (row.get("dictionary") or {}).get("example") or {}
            idx = row.get("example_index") or 0
            sentences.append(Sentence(
                id=row["id"],
                level=row.get("level"),
                full_text=_safe_index(example.get("en"), idx) or "",
                translation=Translation(
                    es=_safe_index(example.get("es"), idx),
                    ru=_safe_index(example.get("ru"), idx),
                ),
                words=row.get("words"),
            ))
        return sentences


class SupabaseDictionaryRepository:
    def list_entries(self, limit: int, with_image_only: bool) -> list[DictionaryEntry]:
        query = supabase.table("dictionary").select("lemma, translation, image")
        if with_image_only:
            query = query.not_.is_("image", "null")
        res = query.limit(limit).execute()
        rows = res.data or []

        return [
            DictionaryEntry(
                lemma=row.get("lemma"),
                translation=row.get("translation") or {},
                image=row.get("image"),
            )
            for row in rows
        ]


def resolve_image_url(storage_path: str | None) -> str | None:
    if not storage_path:
        return None
    if storage_path.startswith("http"):
        return storage_path
    return f"{settings.storage_base}/{storage_path}"
