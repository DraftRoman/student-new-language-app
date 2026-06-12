"""Integration tests for the placement-test HTTP endpoints.

Exercise the routes via TestClient with fake repos overridden through
`app.dependency_overrides`. The two policies this file deliberately
defends:

1. **Server-authoritative scoring** — the client cannot influence the
   answer key. Tests use seeded fake content so a wrong submission scores
   exactly the errors we expect, even when the client sends extra junk.
2. **Idempotent level submit** — replays of the same level produce the
   same response and do not create extra attempts.
"""
from collections.abc import Iterator

import pytest

from app.modules.identity.domain.entities import AuthenticatedUser
from app.modules.placement.domain.value_objects import (
    BLOCK_SIZE_TOTAL,
    CefrLevel,
    Construction,
    SentenceItem,
    VocabItem,
)

AUTH = {"Authorization": "Bearer test-token"}
USER_ID = "user-1"


def _login(identity_provider) -> None:
    identity_provider.user = AuthenticatedUser(id=USER_ID, email="u@example.com")


# ---- content helpers -----------------------------------------------------

def _vocab(prefix: str, count: int) -> list[VocabItem]:
    return [
        VocabItem(id=f"{prefix}-v{i:02d}", question=f"q{i}", answer=f"a{i}")
        for i in range(1, count + 1)
    ]


def _sentence(prefix: str, count: int) -> list[SentenceItem]:
    return [
        SentenceItem(
            id=f"{prefix}-s{i:02d}",
            construction=Construction.AFFIRMATIVE,
            elements=("x", "y", "z"),
            correct_order=("x", "y", "z"),
        )
        for i in range(1, count + 1)
    ]


def _seed_full_block(content, level: CefrLevel) -> None:
    """20 vocab + 5 sentences — a canonical 25-item block."""
    content.vocab[level] = _vocab(level.value.lower(), 20)
    content.sentence[level] = _sentence(level.value.lower(), 5)


def _all_correct_payload(content, level: CefrLevel) -> dict:
    """Build a request body that scores 0 errors against the seeded content."""
    return {
        "vocab": {v.id: v.answer for v in content.vocab.get(level, [])},
        "sentence": {s.id: list(s.correct_order) for s in content.sentence.get(level, [])},
    }


def _empty_payload() -> dict:
    return {"vocab": {}, "sentence": {}}


@pytest.fixture
def logged_in(identity_provider) -> Iterator[None]:
    _login(identity_provider)
    yield


# ---- /onboarding/prior-experience ---------------------------------------

class TestPriorExperience:
    def test_requires_token(self, client):
        r = client.post("/api/onboarding/prior-experience", json={"studied_before": False})
        assert r.status_code == 401

    def test_no_returns_a1_fast_path(self, client, logged_in, placement_session_repo):
        r = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": False},
            headers=AUTH,
        )
        assert r.status_code == 200
        assert r.json() == {"level": "A1", "test_required": False}
        # Critical: the "no" branch must NOT create a session — story §4.1
        # explicitly says beginners "never see the test".
        assert placement_session_repo.saved == []

    def test_yes_creates_session_and_returns_first_block(
        self, client, logged_in, placement_session_repo, placement_content,
    ):
        _seed_full_block(placement_content, CefrLevel.A1)

        r = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        )

        assert r.status_code == 200
        body = r.json()
        assert body["test_required"] is True
        assert body["current_level"] == "A1"
        assert body["block"]["level"] == "A1"
        assert len(body["block"]["vocab"]) == 20
        assert len(body["block"]["sentence"]) == 5
        assert body["block"]["vocab_page_size"] == 5
        assert body["block"]["total_items"] == BLOCK_SIZE_TOTAL
        # Session persisted.
        assert body["session_id"] in placement_session_repo.store

    def test_yes_resumes_existing_in_progress_session(
        self, client, logged_in, placement_session_repo, placement_content,
    ):
        """§5.1: a user re-answering the gate must NOT lose mid-test progress."""
        _seed_full_block(placement_content, CefrLevel.A1)

        first = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        )
        sid = first.json()["session_id"]

        again = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        )
        assert again.status_code == 200
        assert again.json()["session_id"] == sid  # same session reused


# ---- GET /placement/{sid}/level/{level}/block ---------------------------

class TestGetBlock:
    def test_404_when_session_missing(self, client, logged_in):
        r = client.get("/api/placement/nope/level/A1/block", headers=AUTH)
        assert r.status_code == 404

    def test_404_when_session_belongs_to_another_user(
        self, client, logged_in, placement_content, placement_session_repo,
    ):
        """Cross-user access leaks no info — surfaces as 404, not 403."""
        _seed_full_block(placement_content, CefrLevel.A1)
        # Create a session as another user via direct repo seeding by
        # impersonating; here we just temporarily switch identity then
        # restore — simpler than wiring a second user fixture.
        from app.modules.placement.application.use_cases import (
            AnswerPriorExperienceUseCase,
        )
        sid = AnswerPriorExperienceUseCase(
            placement_session_repo, placement_content,
        ).execute(user_id="other-user", studied_before=True)["session_id"]

        r = client.get(f"/api/placement/{sid}/level/A1/block", headers=AUTH)
        assert r.status_code == 404

    def test_400_when_requested_level_does_not_match_current(
        self, client, identity_provider, placement_session_repo, placement_content,
    ):
        _login(identity_provider)
        _seed_full_block(placement_content, CefrLevel.A1)
        start = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        ).json()
        sid = start["session_id"]

        # Current level is A1; asking for A2 must be refused.
        r = client.get(f"/api/placement/{sid}/level/A2/block", headers=AUTH)
        assert r.status_code == 400


# ---- POST /placement/{sid}/level/{level}/answers ------------------------

class TestSubmitAnswers:
    def _start(self, client, content) -> str:
        _seed_full_block(content, CefrLevel.A1)
        _seed_full_block(content, CefrLevel.A2)
        _seed_full_block(content, CefrLevel.B1)
        r = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        )
        return r.json()["session_id"]

    def test_pass_advances_to_next_level(
        self, client, logged_in, placement_content,
    ):
        sid = self._start(client, placement_content)
        body = _all_correct_payload(placement_content, CefrLevel.A1)

        r = client.post(
            f"/api/placement/{sid}/level/A1/answers", json=body, headers=AUTH,
        )

        assert r.status_code == 200
        out = r.json()
        assert out["level"] == "A1"
        assert out["errors"] == 0
        assert out["passed"] is True
        assert out["next_level"] == "A2"
        assert out["recommended_level"] is None  # test still running

    def test_fail_completes_test_and_recommends_last_passed(
        self, client, logged_in, placement_content, placement_session_repo,
    ):
        """Worked example from story §8: A1 pass, A2 pass, B1 fail → A2."""
        sid = self._start(client, placement_content)

        client.post(
            f"/api/placement/{sid}/level/A1/answers",
            json=_all_correct_payload(placement_content, CefrLevel.A1),
            headers=AUTH,
        )
        client.post(
            f"/api/placement/{sid}/level/A2/answers",
            json=_all_correct_payload(placement_content, CefrLevel.A2),
            headers=AUTH,
        )
        # B1: submit empty answers → all 25 items wrong → fails (≥4 errors).
        fail = client.post(
            f"/api/placement/{sid}/level/B1/answers",
            json=_empty_payload(),
            headers=AUTH,
        )

        assert fail.status_code == 200
        out = fail.json()
        assert out["level"] == "B1"
        assert out["passed"] is False
        assert out["next_level"] is None
        assert out["recommended_level"] == "A2"
        assert placement_session_repo.store[sid].status.value == "completed"

    def test_a1_fail_floors_to_a1_q1(
        self, client, logged_in, placement_content,
    ):
        sid = self._start(client, placement_content)
        r = client.post(
            f"/api/placement/{sid}/level/A1/answers",
            json=_empty_payload(),
            headers=AUTH,
        )
        assert r.json()["recommended_level"] == "A1"

    def test_pass_through_c2_caps_at_c2_q2(
        self, client, logged_in, placement_content, placement_session_repo,
    ):
        for lvl in CefrLevel:
            _seed_full_block(placement_content, lvl)
        sid = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        ).json()["session_id"]

        for lvl in CefrLevel:
            client.post(
                f"/api/placement/{sid}/level/{lvl.value}/answers",
                json=_all_correct_payload(placement_content, lvl),
                headers=AUTH,
            )

        result = client.get(f"/api/placement/{sid}/result", headers=AUTH)
        assert result.json()["recommended_level"] == "C2"
        # +1 ceiling disabled at C2.
        assert result.json()["allowed_max_level"] == "C2"

    def test_idempotent_replay_does_not_create_second_attempt(
        self, client, logged_in, placement_content, placement_session_repo,
    ):
        """§5.1 idempotency: double-submission of a level returns the same
        verdict and leaves the session in the same state."""
        sid = self._start(client, placement_content)
        body = _all_correct_payload(placement_content, CefrLevel.A1)

        first = client.post(
            f"/api/placement/{sid}/level/A1/answers", json=body, headers=AUTH,
        ).json()

        # Second submission with WRONG answers — must still return the
        # original verdict; the answer key cannot be "corrected" on replay.
        second = client.post(
            f"/api/placement/{sid}/level/A1/answers",
            json=_empty_payload(),
            headers=AUTH,
        ).json()

        assert second == first
        session = placement_session_repo.store[sid]
        a1_attempts = [a for a in session.attempts if a.level == CefrLevel.A1]
        assert len(a1_attempts) == 1

    def test_server_ignores_client_supplied_extra_keys(
        self, client, logged_in, placement_content,
    ):
        """Server-authoritative scoring: stale/spoofed answer ids don't
        change the error count."""
        sid = self._start(client, placement_content)
        body = _all_correct_payload(placement_content, CefrLevel.A1)
        body["vocab"]["ghost-id"] = "junk"
        body["sentence"]["another-ghost"] = ["junk"]

        r = client.post(
            f"/api/placement/{sid}/level/A1/answers", json=body, headers=AUTH,
        )
        assert r.json()["errors"] == 0


# ---- /placement/{sid}/result --------------------------------------------

class TestGetResult:
    def test_400_when_test_still_in_progress(
        self, client, logged_in, placement_content,
    ):
        _seed_full_block(placement_content, CefrLevel.A1)
        sid = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        ).json()["session_id"]

        r = client.get(f"/api/placement/{sid}/result", headers=AUTH)
        assert r.status_code == 400

    def test_returns_recommended_and_allowed_max(
        self, client, logged_in, placement_content,
    ):
        _seed_full_block(placement_content, CefrLevel.A1)
        sid = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        ).json()["session_id"]
        client.post(
            f"/api/placement/{sid}/level/A1/answers",
            json=_empty_payload(),
            headers=AUTH,
        )

        r = client.get(f"/api/placement/{sid}/result", headers=AUTH)
        assert r.status_code == 200
        # A1 failed → floor A1; +1 ceiling enabled → A2.
        assert r.json() == {
            "recommended_level": "A1",
            "allowed_max_level": "A2",
            "confirmed_level": None,
        }


# ---- /placement/{sid}/confirm -------------------------------------------

class TestConfirm:
    def _finish_with_recommended_a2(self, client, content) -> str:
        """Run a session to completion ending at A2 recommendation (worked example)."""
        _seed_full_block(content, CefrLevel.A1)
        _seed_full_block(content, CefrLevel.A2)
        _seed_full_block(content, CefrLevel.B1)
        sid = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        ).json()["session_id"]
        client.post(
            f"/api/placement/{sid}/level/A1/answers",
            json=_all_correct_payload(content, CefrLevel.A1),
            headers=AUTH,
        )
        client.post(
            f"/api/placement/{sid}/level/A2/answers",
            json=_all_correct_payload(content, CefrLevel.A2),
            headers=AUTH,
        )
        client.post(
            f"/api/placement/{sid}/level/B1/answers",
            json=_empty_payload(),
            headers=AUTH,
        )
        return sid

    def test_accept_recommendation(
        self, client, logged_in, placement_content, placement_session_repo,
    ):
        sid = self._finish_with_recommended_a2(client, placement_content)
        r = client.post(
            f"/api/placement/{sid}/confirm",
            json={"chosen_level": "A2"},
            headers=AUTH,
        )
        assert r.status_code == 200
        assert r.json() == {"confirmed_level": "A2"}
        assert placement_session_repo.store[sid].confirmed_level == CefrLevel.A2

    def test_plus_one_override_allowed(
        self, client, logged_in, placement_content,
    ):
        sid = self._finish_with_recommended_a2(client, placement_content)
        r = client.post(
            f"/api/placement/{sid}/confirm",
            json={"chosen_level": "B1"},
            headers=AUTH,
        )
        assert r.status_code == 200
        assert r.json()["confirmed_level"] == "B1"

    def test_two_steps_above_rejected(
        self, client, logged_in, placement_content,
    ):
        sid = self._finish_with_recommended_a2(client, placement_content)
        r = client.post(
            f"/api/placement/{sid}/confirm",
            json={"chosen_level": "B2"},
            headers=AUTH,
        )
        assert r.status_code == 400

    def test_below_recommended_rejected(
        self, client, logged_in, placement_content,
    ):
        sid = self._finish_with_recommended_a2(client, placement_content)
        r = client.post(
            f"/api/placement/{sid}/confirm",
            json={"chosen_level": "A1"},
            headers=AUTH,
        )
        assert r.status_code == 400

    def test_confirm_before_completion_rejected(
        self, client, logged_in, placement_content,
    ):
        _seed_full_block(placement_content, CefrLevel.A1)
        sid = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        ).json()["session_id"]
        r = client.post(
            f"/api/placement/{sid}/confirm",
            json={"chosen_level": "A1"},
            headers=AUTH,
        )
        assert r.status_code == 400

    def test_changing_confirmed_level_rejected_q56(
        self, client, logged_in, placement_content,
    ):
        """§5.6: 'After confirmation, the entry path is closed for that user.'"""
        sid = self._finish_with_recommended_a2(client, placement_content)
        client.post(
            f"/api/placement/{sid}/confirm",
            json={"chosen_level": "A2"},
            headers=AUTH,
        )
        # Idempotent re-confirm with same level is fine...
        same = client.post(
            f"/api/placement/{sid}/confirm",
            json={"chosen_level": "A2"},
            headers=AUTH,
        )
        assert same.status_code == 200
        # ...but switching to a different level is not.
        switch = client.post(
            f"/api/placement/{sid}/confirm",
            json={"chosen_level": "B1"},
            headers=AUTH,
        )
        assert switch.status_code == 400


# ---- Content-gap (Q5) integration ---------------------------------------

class TestContentGapIntegration:
    def test_sparse_block_uses_scaled_threshold(
        self, client, logged_in, placement_content,
    ):
        """Q5: a level with < 25 items must still score and complete the
        ladder — no crash, scaled threshold."""
        placement_content.vocab[CefrLevel.A1] = _vocab("a1", 5)
        placement_content.sentence[CefrLevel.A1] = _sentence("a1", 1)
        sid = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        ).json()["session_id"]

        # 6-item block → threshold = max(1, round(4*6/25)) = 1.
        # All-correct → 0 errors < 1 → pass, climb to A2.
        r = client.post(
            f"/api/placement/{sid}/level/A1/answers",
            json=_all_correct_payload(placement_content, CefrLevel.A1),
            headers=AUTH,
        )
        assert r.status_code == 200
        assert r.json()["passed"] is True
        assert r.json()["next_level"] == "A2"

    def test_sparse_block_emits_content_gap_warning_q5(
        self, client, logged_in, placement_content, caplog,
    ):
        """Q5 makes content gaps visible to the content team rather than
        letting them silently degrade UX."""
        import logging
        placement_content.vocab[CefrLevel.A1] = _vocab("a1", 5)
        placement_content.sentence[CefrLevel.A1] = _sentence("a1", 1)
        sid = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        ).json()["session_id"]

        with caplog.at_level(logging.WARNING, logger="app.modules.placement.application.use_cases"):
            client.post(
                f"/api/placement/{sid}/level/A1/answers",
                json=_all_correct_payload(placement_content, CefrLevel.A1),
                headers=AUTH,
            )

        gap_records = [r for r in caplog.records if "content gap" in r.getMessage()]
        assert len(gap_records) == 1
        msg = gap_records[0].getMessage()
        assert "A1" in msg and "6/25" in msg

    def test_full_block_does_not_emit_warning(
        self, client, logged_in, placement_content, caplog,
    ):
        """Mirror of the above — a properly populated level must not spam
        the log."""
        import logging
        _seed_full_block(placement_content, CefrLevel.A1)
        sid = client.post(
            "/api/onboarding/prior-experience",
            json={"studied_before": True},
            headers=AUTH,
        ).json()["session_id"]

        with caplog.at_level(logging.WARNING, logger="app.modules.placement.application.use_cases"):
            client.post(
                f"/api/placement/{sid}/level/A1/answers",
                json=_all_correct_payload(placement_content, CefrLevel.A1),
                headers=AUTH,
            )

        gap_records = [r for r in caplog.records if "content gap" in r.getMessage()]
        assert gap_records == []
