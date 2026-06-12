"""Supabase client (real or stub).

If SUPABASE_URL / SUPABASE_SERVICE_KEY look like placeholders (or fail
JWT/URL shape checks), a stub is used: the server boots cleanly and
Supabase-backed code returns empty results / unauthorized, rather than crashing.
"""
import re
from types import SimpleNamespace
from typing import Any

from supabase import create_client

from app.config import settings

_JWT_RE = re.compile(r"^[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_.+/=]*$")
_URL_RE = re.compile(r"^https?://.+")
_PLACEHOLDER_HINTS = ("your-project", "replace-with", "change-me")


def _is_configured() -> bool:
    url = settings.supabase_url or ""
    key = settings.supabase_service_key or ""
    if not _URL_RE.match(url) or any(h in url for h in _PLACEHOLDER_HINTS):
        return False
    if not _JWT_RE.match(key) or any(h in key for h in _PLACEHOLDER_HINTS):
        return False
    return True


class _StubQuery:
    def select(self, *_a, **_kw): return self
    def eq(self, *_a, **_kw): return self
    def is_(self, *_a, **_kw): return self
    def limit(self, *_a, **_kw): return self
    def insert(self, *_a, **_kw): return self
    def update(self, *_a, **_kw): return self

    @property
    def not_(self): return self

    def execute(self) -> Any:
        return SimpleNamespace(data=[])


class _StubAuth:
    def get_user(self, _token):
        return SimpleNamespace(user=None)


class _StubClient:
    def table(self, _name: str) -> _StubQuery:
        return _StubQuery()

    @property
    def auth(self) -> _StubAuth:
        return _StubAuth()


if _is_configured():
    supabase: Any = create_client(settings.supabase_url, settings.supabase_service_key)
else:
    supabase = _StubClient()
