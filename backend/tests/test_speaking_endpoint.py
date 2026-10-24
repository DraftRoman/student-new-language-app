"""Integration tests for POST /api/v1/pronunciation/check.

Drives the full presentation → application → domain path with a fake
SttEngine (no model, no weights), via app.dependency_overrides — same
pattern as the progress/placement endpoint tests.
"""
from app.modules.identity.domain.entities import AuthenticatedUser
from app.shared.exceptions import ValidationError

URL = "/api/v1/pronunciation/check"
AUTH = {"Authorization": "Bearer test-token"}


def _login(identity_provider, user_id="user-1"):
    identity_provider.user = AuthenticatedUser(id=user_id, email="u@example.com")


def _files(data: bytes = b"fake-audio-bytes", content_type="audio/webm"):
    return {"audio_file": ("clip.webm", data, content_type)}


def _form(expected="the cat sat", course_lang="en", **extra):
    return {"exercise_id": "ex-1", "expected_text": expected, "course_lang": course_lang, **extra}


def test_requires_token(client):
    resp = client.post(URL, files=_files(), data=_form())
    assert resp.status_code == 401


def test_rejects_invalid_token(client, identity_provider):
    # identity_provider.user is None → token resolves to nobody.
    resp = client.post(URL, files=_files(), data=_form(), headers=AUTH)
    assert resp.status_code == 401


def test_perfect_pronunciation_scores_excellent(client, identity_provider, stt_engine):
    _login(identity_provider)
    stt_engine.recognized = "the cat sat"

    resp = client.post(URL, files=_files(), data=_form(), headers=AUTH)

    assert resp.status_code == 200
    body = resp.json()
    assert body["recognized_text"] == "the cat sat"
    assert body["match_pct"] == 100
    assert body["status"] == "excellent"
    assert body["details"]["words_matched"] == 3
    assert body["details"]["missing"] == []
    assert body["details"]["extra"] == []
    assert "latency_ms" in body


def test_partial_pronunciation_scores_retry(client, identity_provider, stt_engine):
    _login(identity_provider)
    stt_engine.recognized = "the dog sat"

    resp = client.post(URL, files=_files(), data=_form(), headers=AUTH)

    body = resp.json()
    assert body["match_pct"] == 67
    assert body["status"] == "retry"
    assert body["details"]["missing"] == ["cat"]
    assert body["details"]["extra"] == ["dog"]


def test_silence_is_retry_not_error_e5(client, identity_provider, stt_engine):
    _login(identity_provider)
    stt_engine.recognized = ""  # VAD filtered everything

    resp = client.post(URL, files=_files(), data=_form(), headers=AUTH)

    assert resp.status_code == 200
    body = resp.json()
    assert body["match_pct"] == 0
    assert body["status"] == "retry"
    assert body["recognized_text"] == ""


def test_course_lang_is_passed_to_engine(client, identity_provider, stt_engine):
    _login(identity_provider)
    stt_engine.recognized = "hola mundo"

    client.post(URL, files=_files(), data=_form(expected="hola mundo", course_lang="es"), headers=AUTH)

    assert stt_engine.calls[-1][2] == "es"


def test_empty_audio_is_rejected(client, identity_provider):
    _login(identity_provider)
    resp = client.post(URL, files=_files(data=b""), data=_form(), headers=AUTH)
    assert resp.status_code == 400


def test_oversize_audio_is_rejected(client, identity_provider, monkeypatch):
    from app.config import settings

    _login(identity_provider)
    monkeypatch.setattr(settings, "max_audio_bytes", 8)
    resp = client.post(URL, files=_files(data=b"x" * 64), data=_form(), headers=AUTH)
    assert resp.status_code == 413


def test_bad_audio_from_engine_is_400(client, identity_provider, stt_engine):
    _login(identity_provider)
    stt_engine.error = ValidationError("could not decode audio")

    resp = client.post(URL, files=_files(), data=_form(), headers=AUTH)

    assert resp.status_code == 400
    assert "decode" in resp.json()["detail"]


def test_timeout_is_retryable_503_e3(client, identity_provider, stt_engine, monkeypatch):
    from app.config import settings

    _login(identity_provider)
    monkeypatch.setattr(settings, "stt_timeout_seconds", 0.05)
    stt_engine.delay = 0.5  # exceeds the budget

    resp = client.post(URL, files=_files(), data=_form(), headers=AUTH)

    assert resp.status_code == 503


def test_invalid_task_type_is_422(client, identity_provider, stt_engine):
    _login(identity_provider)
    stt_engine.recognized = "the cat sat"
    resp = client.post(URL, files=_files(), data=_form(task_type="paragraph"), headers=AUTH)
    assert resp.status_code == 422


# ─── S5: persistence ─────────────────────────────────────────────────────


def test_attempt_is_persisted(client, identity_provider, stt_engine, attempt_repo):
    _login(identity_provider, user_id="user-9")
    stt_engine.recognized = "the dog sat"

    client.post(
        URL,
        files=_files(),
        data=_form(task_type="sentence", attempt_no=3),
        headers=AUTH,
    )

    assert len(attempt_repo.saved) == 1
    saved = attempt_repo.saved[0]
    assert saved.user_id == "user-9"
    assert saved.exercise_id == "ex-1"
    assert saved.recognized_text == "the dog sat"
    assert saved.task_type.value == "sentence"
    assert saved.attempt_no == 3
    assert saved.score.match_pct == 67
    assert saved.score.status.value == "retry"
    assert saved.score.details.missing == ("cat",)


def test_persistence_failure_does_not_break_result(
    client, identity_provider, stt_engine, attempt_repo,
):
    _login(identity_provider)
    stt_engine.recognized = "the cat sat"
    attempt_repo.error = RuntimeError("db down")

    resp = client.post(URL, files=_files(), data=_form(), headers=AUTH)

    # Learner still gets their score — no lesson dead-end.
    assert resp.status_code == 200
    assert resp.json()["match_pct"] == 100
    assert attempt_repo.saved == []


# ─── S6: analytics ───────────────────────────────────────────────────────


def test_analytics_events_on_success(client, identity_provider, stt_engine):
    import structlog

    _login(identity_provider)
    stt_engine.recognized = "the cat sat"

    with structlog.testing.capture_logs() as logs:
        client.post(URL, files=_files(), data=_form(), headers=AUTH)

    events = [e["event"] for e in logs]
    assert "audio_submitted" in events
    assert "stt_completed" in events
    assert "pronunciation_scored" in events

    scored = next(e for e in logs if e["event"] == "pronunciation_scored")
    assert scored["match_pct"] == 100
    assert scored["status"] == "excellent"


def test_analytics_no_speech_on_silence(client, identity_provider, stt_engine):
    import structlog

    _login(identity_provider)
    stt_engine.recognized = ""

    with structlog.testing.capture_logs() as logs:
        client.post(URL, files=_files(), data=_form(), headers=AUTH)

    failures = [e for e in logs if e["event"] == "stt_failed"]
    assert any(e["reason"] == "no_speech" for e in failures)


def test_analytics_timeout_failure(client, identity_provider, stt_engine, monkeypatch):
    import structlog

    from app.config import settings

    _login(identity_provider)
    monkeypatch.setattr(settings, "stt_timeout_seconds", 0.05)
    stt_engine.delay = 0.5

    with structlog.testing.capture_logs() as logs:
        client.post(URL, files=_files(), data=_form(), headers=AUTH)

    failures = [e for e in logs if e["event"] == "stt_failed"]
    assert any(e["reason"] == "timeout" for e in failures)
