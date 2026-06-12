"""End-to-end placement-test scenarios from story §8.

These tests are deliberately written as *single cohesive journeys* through
the HTTP surface — one for the experienced learner ("yes" branch) and one
for the absolute beginner ("no" branch). The fine-grained branching is
already covered in [test_placement_endpoints.py](test_placement_endpoints.py);
this file is what a reviewer can read top-to-bottom to confirm the story's
two named flows produce the expected user-visible outcome.

Why a separate file: §8 explicitly lists these as acceptance integration
tests. Splitting them across unit / endpoint tests makes the trace harder
to follow than just one scenario per story flow.
"""
from app.modules.identity.domain.entities import AuthenticatedUser
from app.modules.placement.domain.value_objects import (
    BLOCK_SIZE_TOTAL,
    CefrLevel,
    Construction,
    SentenceItem,
    VocabItem,
)

AUTH = {"Authorization": "Bearer test-token"}
USER_ID = "e2e-user"


def _login(identity_provider) -> None:
    identity_provider.user = AuthenticatedUser(id=USER_ID, email="e2e@example.com")


def _seed_full_block(content, level: CefrLevel) -> None:
    """20 vocab + 5 sentence — a full 25-item block."""
    content.vocab[level] = [
        VocabItem(id=f"{level.value.lower()}-v{i:02d}", question=f"q{i}", answer=f"a{i}")
        for i in range(1, 21)
    ]
    content.sentence[level] = [
        SentenceItem(
            id=f"{level.value.lower()}-s{i:02d}",
            construction=Construction.AFFIRMATIVE,
            elements=("x", "y", "z"),
            correct_order=("x", "y", "z"),
        )
        for i in range(1, 6)
    ]


def _all_correct_answers(content, level: CefrLevel) -> dict:
    return {
        "vocab":    {v.id: v.answer for v in content.vocab[level]},
        "sentence": {s.id: list(s.correct_order) for s in content.sentence[level]},
    }


def test_full_happy_path_yes_then_ladder_then_recommend_plus_one_then_confirm_then_start(
    client, identity_provider, placement_content, placement_session_repo,
):
    """§8: yes → ladder → recommend → +1 → confirm → start.

    Walks the story's "worked example" (A1 pass, A2 pass, B1 fail → recommended A2),
    then exercises the +1 override (A2 → B1), then confirms and verifies the
    session is closed with the user-chosen level persisted (§4.6 / §5.6).
    """
    _login(identity_provider)
    for lvl in (CefrLevel.A1, CefrLevel.A2, CefrLevel.B1):
        _seed_full_block(placement_content, lvl)

    # ── Gate: "yes, I've studied before" ────────────────────────────────
    gate = client.post(
        "/api/onboarding/prior-experience",
        json={"studied_before": True},
        headers=AUTH,
    )
    assert gate.status_code == 200
    payload = gate.json()
    assert payload["test_required"] is True
    assert payload["current_level"] == "A1"
    session_id = payload["session_id"]
    # Client must paginate vocab at 5/screen — server tells it the page size.
    assert payload["block"]["vocab_page_size"] == 5
    assert payload["block"]["total_items"] == BLOCK_SIZE_TOTAL

    # ── A1 block: all-correct → pass, advance to A2 ─────────────────────
    a1 = client.post(
        f"/api/placement/{session_id}/level/A1/answers",
        json=_all_correct_answers(placement_content, CefrLevel.A1),
        headers=AUTH,
    )
    assert a1.json() == {
        "level":              "A1",
        "errors":             0,
        "passed":             True,
        "next_level":         "A2",
        "recommended_level":  None,
    }

    # ── A2 block: all-correct → pass, advance to B1 ─────────────────────
    a2 = client.post(
        f"/api/placement/{session_id}/level/A2/answers",
        json=_all_correct_answers(placement_content, CefrLevel.A2),
        headers=AUTH,
    )
    assert a2.json()["next_level"] == "B1"

    # ── B1 block: empty answers → 25 errors → fail, test ends ──────────
    b1 = client.post(
        f"/api/placement/{session_id}/level/B1/answers",
        json={"vocab": {}, "sentence": {}},
        headers=AUTH,
    )
    assert b1.json()["passed"] is False
    # The story's worked example: last passed level is A2 → that's the rec.
    assert b1.json()["recommended_level"] == "A2"
    assert b1.json()["next_level"] is None

    # ── Result screen: recommended A2, +1 ceiling = B1 ──────────────────
    result = client.get(f"/api/placement/{session_id}/result", headers=AUTH)
    assert result.json() == {
        "recommended_level": "A2",
        "allowed_max_level": "B1",
        "confirmed_level":   None,
    }

    # ── Confirm with the +1 override (B1) — story §4.5 ──────────────────
    confirm = client.post(
        f"/api/placement/{session_id}/confirm",
        json={"chosen_level": "B1"},
        headers=AUTH,
    )
    assert confirm.status_code == 200
    assert confirm.json() == {"confirmed_level": "B1"}

    # ── Verify persisted state: confirmed level locked in ───────────────
    session = placement_session_repo.store[session_id]
    assert session.confirmed_level == CefrLevel.B1
    assert session.recommended_level == CefrLevel.A2

    # ── §5.6: entry path closed — changing the confirmed level rejected ─
    relock = client.post(
        f"/api/placement/{session_id}/confirm",
        json={"chosen_level": "A2"},
        headers=AUTH,
    )
    assert relock.status_code == 400


def test_beginner_path_no_assigns_a1_and_starts_without_test(
    client, identity_provider, placement_session_repo,
):
    """§8: no → A1 → start. The beginner never sees the test (§4.1)."""
    _login(identity_provider)

    gate = client.post(
        "/api/onboarding/prior-experience",
        json={"studied_before": False},
        headers=AUTH,
    )

    assert gate.status_code == 200
    assert gate.json() == {"level": "A1", "test_required": False}

    # Critical invariant: no session was created. A beginner clicking "no"
    # must NOT leave a dangling in_progress session that a later mistake
    # could resume into (§4.1: "they never see the test").
    assert placement_session_repo.saved == []
    assert placement_session_repo.get_active_for_user(USER_ID) is None
