import os

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault(
    "SUPABASE_SERVICE_KEY",
    "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.test",
)

from collections.abc import Iterator

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.modules.catalog.domain.entities import DictionaryEntry, Sentence
from app.modules.catalog.presentation.dependencies import (
    get_dictionary_repository,
    get_sentence_repository,
)
from app.modules.identity.domain.entities import AuthenticatedUser
from app.modules.identity.presentation.dependencies import get_identity_provider
from app.modules.placement.domain.entities import PlacementSession
from app.modules.placement.domain.value_objects import (
    CefrLevel,
    SentenceItem,
    SessionStatus,
    VocabItem,
)
from app.modules.placement.presentation.dependencies import (
    get_content_source,
    get_session_repository,
)
from app.modules.progress.domain.entities import SentenceProgress, WordProgress
from app.modules.progress.presentation.dependencies import (
    get_sentence_progress_repository,
    get_word_progress_repository,
)


class FakeSentenceRepo:
    def __init__(self, sentences: list[Sentence] | None = None):
        self.sentences = sentences or []

    def list_active(self, level: str | None = None) -> list[Sentence]:
        if level is None:
            return list(self.sentences)
        return [s for s in self.sentences if s.level == level]


class FakeDictionaryRepo:
    def __init__(self, entries: list[DictionaryEntry] | None = None):
        self.entries = entries or []

    def list_entries(self, limit: int, with_image_only: bool) -> list[DictionaryEntry]:
        pool = [e for e in self.entries if e.image] if with_image_only else list(self.entries)
        return pool[:limit]


class FakeSentenceProgressRepo:
    def __init__(self):
        self.store: dict[tuple[str, str | int], SentenceProgress] = {}
        self.saved: list[SentenceProgress] = []

    def find(self, user_id: str, exercise_id: int | str) -> SentenceProgress | None:
        return self.store.get((user_id, exercise_id))

    def save(self, progress: SentenceProgress) -> None:
        self.saved.append(progress)
        if progress.id is None:
            progress.id = len(self.store) + 1
        self.store[(progress.user_id, progress.exercise_id)] = progress

    def list_for_user(self, user_id: str) -> list[SentenceProgress]:
        return [p for k, p in self.store.items() if k[0] == user_id]


class FakeWordProgressRepo:
    def __init__(self):
        self.store: dict[tuple[str, str, str], WordProgress] = {}
        self.saved: list[WordProgress] = []

    def find(self, user_id: str, lemma: str, language: str) -> WordProgress | None:
        return self.store.get((user_id, lemma, language))

    def save(self, progress: WordProgress) -> None:
        self.saved.append(progress)
        if progress.id is None:
            progress.id = len(self.store) + 1
        self.store[(progress.user_id, progress.lemma, progress.language)] = progress


class FakeIdentityProvider:
    def __init__(self, user: AuthenticatedUser | None = None):
        self.user = user

    def resolve(self, _token: str) -> AuthenticatedUser | None:
        return self.user


class FakePlacementSessionRepo:
    """In-memory PlacementSessionRepository for endpoint tests.

    Stores the session object directly (no JSON round-trip) so tests can
    assert on the same instance they handed in; this matches the way the
    in-process JSON repo behaves for a single TestClient request.
    """

    def __init__(self) -> None:
        self.store: dict[str, PlacementSession] = {}
        self.saved: list[PlacementSession] = []

    def get(self, session_id: str) -> PlacementSession | None:
        return self.store.get(session_id)

    def get_active_for_user(self, user_id: str) -> PlacementSession | None:
        for s in self.store.values():
            if s.user_id == user_id and s.status is SessionStatus.IN_PROGRESS:
                return s
        return None

    def save(self, session: PlacementSession) -> None:
        self.saved.append(session)
        self.store[session.id] = session


class FakeContentSource:
    """In-memory ContentSource. Tests seed only the levels they exercise;
    unseeded levels return [] so ContentGapPolicy can run end-to-end."""

    def __init__(self) -> None:
        self.vocab: dict[CefrLevel, list[VocabItem]] = {}
        self.sentence: dict[CefrLevel, list[SentenceItem]] = {}

    def vocab_for(self, level: CefrLevel) -> list[VocabItem]:
        return list(self.vocab.get(level, []))

    def sentences_for(self, level: CefrLevel) -> list[SentenceItem]:
        return list(self.sentence.get(level, []))


@pytest.fixture
def sentence_repo() -> FakeSentenceRepo:
    return FakeSentenceRepo()


@pytest.fixture
def dictionary_repo() -> FakeDictionaryRepo:
    return FakeDictionaryRepo()


@pytest.fixture
def sentence_progress_repo() -> FakeSentenceProgressRepo:
    return FakeSentenceProgressRepo()


@pytest.fixture
def word_progress_repo() -> FakeWordProgressRepo:
    return FakeWordProgressRepo()


@pytest.fixture
def identity_provider() -> FakeIdentityProvider:
    return FakeIdentityProvider()


@pytest.fixture
def placement_session_repo() -> FakePlacementSessionRepo:
    return FakePlacementSessionRepo()


@pytest.fixture
def placement_content() -> FakeContentSource:
    return FakeContentSource()


@pytest.fixture
def client(
    sentence_repo: FakeSentenceRepo,
    dictionary_repo: FakeDictionaryRepo,
    sentence_progress_repo: FakeSentenceProgressRepo,
    word_progress_repo: FakeWordProgressRepo,
    identity_provider: FakeIdentityProvider,
    placement_session_repo: FakePlacementSessionRepo,
    placement_content: FakeContentSource,
) -> Iterator[TestClient]:
    app.dependency_overrides[get_sentence_repository] = lambda: sentence_repo
    app.dependency_overrides[get_dictionary_repository] = lambda: dictionary_repo
    app.dependency_overrides[get_sentence_progress_repository] = lambda: sentence_progress_repo
    app.dependency_overrides[get_word_progress_repository] = lambda: word_progress_repo
    app.dependency_overrides[get_identity_provider] = lambda: identity_provider
    app.dependency_overrides[get_session_repository] = lambda: placement_session_repo
    app.dependency_overrides[get_content_source] = lambda: placement_content
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()
