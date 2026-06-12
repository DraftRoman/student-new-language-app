from datetime import datetime

from app.modules.identity.domain.entities import AuthenticatedUser
from app.modules.progress.domain.entities import SentenceProgress, WordProgress
from app.modules.progress.domain.value_objects import Mastery

AUTH = {"Authorization": "Bearer test-token"}


def _login(identity_provider, user_id="user-1"):
    identity_provider.user = AuthenticatedUser(id=user_id, email="u@example.com")


def test_sentence_progress_requires_token(client):
    response = client.post("/api/progress/sentence", json={"exercise_id": 1, "correct": True})
    assert response.status_code == 401


def test_sentence_progress_rejects_invalid_token(client):
    response = client.post(
        "/api/progress/sentence",
        json={"exercise_id": 1, "correct": True},
        headers=AUTH,
    )
    assert response.status_code == 401


def test_sentence_progress_inserts_when_no_existing(client, identity_provider, sentence_progress_repo):
    _login(identity_provider)

    response = client.post(
        "/api/progress/sentence",
        json={"exercise_id": 42, "correct": True},
        headers=AUTH,
    )

    assert response.status_code == 200
    assert response.json() == {"success": True}
    saved = sentence_progress_repo.saved[-1]
    assert saved.exercise_id == 42
    assert saved.attempts == 1
    assert saved.correct_count == 1
    assert saved.mastery.level == 1


def test_sentence_progress_updates_with_spaced_repetition_math(
    client, identity_provider, sentence_progress_repo,
):
    _login(identity_provider)
    sentence_progress_repo.store[("user-1", 42)] = SentenceProgress(
        id=99,
        user_id="user-1",
        exercise_id=42,
        attempts=3,
        correct_count=2,
        mastery=Mastery(2),
        next_review_at=datetime.now(),
        last_attempted_at=datetime.now(),
    )

    response = client.post(
        "/api/progress/sentence",
        json={"exercise_id": 42, "correct": True},
        headers=AUTH,
    )

    assert response.status_code == 200
    saved = sentence_progress_repo.saved[-1]
    assert saved.attempts == 4
    assert saved.correct_count == 3
    assert saved.mastery.level == 3
    assert saved.id == 99


def test_sentence_progress_mastery_clamped_at_zero(
    client, identity_provider, sentence_progress_repo,
):
    _login(identity_provider)
    sentence_progress_repo.store[("user-1", 1)] = SentenceProgress(
        id=1, user_id="user-1", exercise_id=1,
        attempts=1, correct_count=0, mastery=Mastery(0),
        next_review_at=datetime.now(), last_attempted_at=datetime.now(),
    )

    response = client.post(
        "/api/progress/sentence",
        json={"exercise_id": 1, "correct": False},
        headers=AUTH,
    )

    assert response.status_code == 200
    assert sentence_progress_repo.saved[-1].mastery.level == 0


def test_sentence_progress_mastery_clamped_at_five(
    client, identity_provider, sentence_progress_repo,
):
    _login(identity_provider)
    sentence_progress_repo.store[("user-1", 1)] = SentenceProgress(
        id=1, user_id="user-1", exercise_id=1,
        attempts=9, correct_count=9, mastery=Mastery(5),
        next_review_at=datetime.now(), last_attempted_at=datetime.now(),
    )

    response = client.post(
        "/api/progress/sentence",
        json={"exercise_id": 1, "correct": True},
        headers=AUTH,
    )

    assert response.status_code == 200
    assert sentence_progress_repo.saved[-1].mastery.level == 5


def test_get_sentence_progress_returns_keyed_map(
    client, identity_provider, sentence_progress_repo,
):
    _login(identity_provider)
    now = datetime(2026, 1, 1, 0, 0, 0)
    sentence_progress_repo.store[("user-1", 1)] = SentenceProgress(
        id=1, user_id="user-1", exercise_id=1,
        attempts=5, correct_count=4, mastery=Mastery(3),
        next_review_at=now, last_attempted_at=now,
    )
    sentence_progress_repo.store[("user-1", 2)] = SentenceProgress(
        id=2, user_id="user-1", exercise_id=2,
        attempts=2, correct_count=0, mastery=Mastery(0),
        next_review_at=now, last_attempted_at=now,
    )

    response = client.get("/api/progress/sentences", headers=AUTH)

    assert response.status_code == 200
    progress = response.json()["progress"]
    assert progress["1"] == {
        "attempts": 5, "correct": 4, "mastery": 3,
        "last_attempted": "2026-01-01T00:00:00",
    }
    assert progress["2"]["mastery"] == 0


def test_word_progress_inserts_when_no_existing(
    client, identity_provider, word_progress_repo,
):
    _login(identity_provider)

    response = client.post(
        "/api/progress/word",
        json={"lemma": "perro", "language": "en-es", "correct": True},
        headers=AUTH,
    )

    assert response.status_code == 200
    saved = word_progress_repo.saved[-1]
    assert saved.lemma == "perro"
    assert saved.attempts == 1
    assert saved.correct_count == 1


def test_word_progress_updates_existing(
    client, identity_provider, word_progress_repo,
):
    _login(identity_provider)
    word_progress_repo.store[("user-1", "gato", "en-es")] = WordProgress(
        id=7, user_id="user-1", lemma="gato", language="en-es",
        attempts=4, correct_count=2,
    )

    response = client.post(
        "/api/progress/word",
        json={"lemma": "gato", "language": "en-es", "correct": False},
        headers=AUTH,
    )

    assert response.status_code == 200
    saved = word_progress_repo.saved[-1]
    assert saved.attempts == 5
    assert saved.correct_count == 2
    assert saved.id == 7
