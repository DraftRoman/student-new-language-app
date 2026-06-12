from app.modules.catalog.domain.entities import DictionaryEntry, Sentence
from app.modules.catalog.domain.value_objects import Translation


def test_sentences_returns_404_when_empty(client):
    response = client.get("/api/game/sentences")

    assert response.status_code == 404
    assert "No sentences found" in response.json()["detail"]


def test_sentences_returns_shaped_rows(client, sentence_repo):
    sentence_repo.sentences = [
        Sentence(
            id=1,
            level="A1",
            full_text="The dog runs.",
            translation=Translation(es="El perro corre.", ru="Собака бежит."),
            words=["The", "dog", "runs"],
        ),
    ]

    response = client.get("/api/game/sentences?level=A1")

    assert response.status_code == 200
    body = response.json()
    assert body["sentences"][0] == {
        "id": 1,
        "level": "A1",
        "full_text": "The dog runs.",
        "translation": {"es": "El perro corre.", "ru": "Собака бежит."},
        "words": ["The", "dog", "runs"],
    }


def test_sentences_filter_by_level(client, sentence_repo):
    sentence_repo.sentences = [
        Sentence(id=1, level="A1", full_text="a", translation=Translation("a", "a"), words=[]),
        Sentence(id=2, level="B1", full_text="b", translation=Translation("b", "b"), words=[]),
    ]

    response = client.get("/api/game/sentences?level=A1")

    assert response.status_code == 200
    assert [s["id"] for s in response.json()["sentences"]] == [1]


def test_wordmatch_rejects_unknown_language(client):
    response = client.get("/api/game/wordmatch?language=xx-yy")

    assert response.status_code == 400
    assert "Unknown language" in response.json()["detail"]


def test_wordmatch_returns_pairs(client, dictionary_repo):
    dictionary_repo.entries = [
        DictionaryEntry(lemma="dog", translation={"es": "perro", "ru": "собака"}, image=None),
        DictionaryEntry(lemma="cat", translation={"es": "gato", "ru": "кошка"}, image=None),
    ]

    response = client.get("/api/game/wordmatch?language=en-es&limit=2")

    assert response.status_code == 200
    body = response.json()
    assert body["imageMode"] is None
    assert len(body["pairs"]) == 2
    assert {p["question"] for p in body["pairs"]} == {"dog", "cat"}


def test_wordmatch_image_mode_resolves_storage_url(client, dictionary_repo):
    dictionary_repo.entries = [
        DictionaryEntry(lemma="dog", translation={"es": "perro"}, image="dog.png"),
    ]

    response = client.get("/api/game/wordmatch?language=en-image&limit=1")

    assert response.status_code == 200
    body = response.json()
    assert body["imageMode"] == "answer"
    pair = body["pairs"][0]
    assert pair["question"] == "dog"
    assert pair["answer"].startswith("https://example.supabase.co/storage/v1/object/public/")
    assert pair["answer"].endswith("/imagesTurtle/dog.png")


def test_wordmatch_returns_404_when_no_translations(client, dictionary_repo):
    dictionary_repo.entries = [
        DictionaryEntry(lemma="dog", translation={"es": "perro"}, image=None),
    ]

    response = client.get("/api/game/wordmatch?language=en-ru")

    assert response.status_code == 404
    assert "en-ru" in response.json()["detail"]
