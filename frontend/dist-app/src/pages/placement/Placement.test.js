import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Placement from "./Placement";
import { setAnalyticsSink } from "../../lib/analytics";
vi.mock("../../lib/placementService", () => ({
    answerPriorExperience: vi.fn(),
    getLevelBlock: vi.fn(),
    submitLevelAnswers: vi.fn(),
    getResult: vi.fn(),
    confirmLevel: vi.fn(),
}));
// Re-import after mock so vi sees the spies.
import * as service from "../../lib/placementService";
const svc = service;
function vocabItem(id, q, a) {
    return { id, question: q, answer: a };
}
function sentenceItem(id) {
    return {
        id,
        construction: "affirmative",
        elements: ["yo", "como", "manzanas"],
        correct_order: ["yo", "como", "manzanas"],
    };
}
function block(level, n = 5) {
    return {
        level,
        vocab: Array.from({ length: n }, (_, i) => vocabItem(`${level.toLowerCase()}-v${i + 1}`, `q${i + 1}`, `a${i + 1}`)),
        sentence: [sentenceItem(`${level.toLowerCase()}-s1`)],
        vocab_page_size: 5,
        total_items: n + 1,
    };
}
function renderAt(initialPath = "/onboarding/placement") {
    return render(_jsx(MemoryRouter, { initialEntries: [initialPath], children: _jsxs(Routes, { children: [_jsx(Route, { path: "/onboarding/placement", element: _jsx(Placement, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx("div", { children: "DASHBOARD" }) })] }) }));
}
describe("Placement orchestrator", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        setAnalyticsSink(() => { });
        window.localStorage.clear();
    });
    it("beginner path: 'no' assigns A1 and routes to /dashboard without showing the test", async () => {
        svc.answerPriorExperience.mockResolvedValue({ test_required: false, level: "A1" });
        renderAt();
        await userEvent.click(await screen.findByRole("button", { name: /starting from scratch/i }));
        await waitFor(() => expect(screen.getByText("DASHBOARD")).toBeInTheDocument());
        expect(svc.answerPriorExperience).toHaveBeenCalledWith(false);
        // Critical: the vocab grid never renders.
        expect(screen.queryByRole("button", { name: /q1/i })).toBeNull();
    });
    it("error path: failure on the gate surfaces a retry screen, not a silent dead-end", async () => {
        svc.answerPriorExperience.mockRejectedValue(new Error("boom"));
        renderAt();
        await userEvent.click(await screen.findByRole("button", { name: /starting from scratch/i }));
        await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
        expect(screen.getByRole("button", { name: /start over/i })).toBeInTheDocument();
    });
    it("resume on refresh: persisted session re-enters vocab phase, skipping the gate (§5.1)", async () => {
        window.localStorage.setItem("placement.session.v1", JSON.stringify({ sessionId: "s-resumed", level: "B1" }));
        svc.getLevelBlock.mockResolvedValue(block("A2"));
        renderAt();
        // Vocab renders without the user touching the gate; resume completed.
        await waitFor(() => {
            expect(screen.getByRole("button", { name: "q1" })).toBeInTheDocument();
        });
        expect(svc.getLevelBlock).toHaveBeenCalledWith("s-resumed", "B1");
        expect(screen.queryByText(/have you studied this language/i)).toBeNull();
        expect(svc.answerPriorExperience).not.toHaveBeenCalled();
    });
    it("stale resume: a failure on resume clears storage and falls back to the gate", async () => {
        window.localStorage.setItem("placement.session.v1", JSON.stringify({ sessionId: "expired", level: "A1" }));
        svc.getLevelBlock.mockRejectedValue(new Error("placement session expired not found"));
        renderAt();
        expect(await screen.findByRole("button", { name: /starting from scratch/i }))
            .toBeInTheDocument();
        expect(window.localStorage.getItem("placement.session.v1")).toBeNull();
    });
    it("ladder happy path: yes → vocab → sentence → confirm; +1 override emits the override event", async () => {
        const overrideEvents = [];
        setAnalyticsSink((name) => overrideEvents.push(name));
        svc.answerPriorExperience.mockResolvedValue({
            test_required: true,
            session_id: "s1",
            current_level: "A1",
            block: block("A1"),
        });
        svc.submitLevelAnswers.mockResolvedValue({
            level: "A1",
            errors: 0,
            passed: true,
            next_level: null, // shortcut: jump straight to result
            recommended_level: "A1",
        });
        svc.getResult.mockResolvedValue({
            recommended_level: "A1",
            allowed_max_level: "A2",
            confirmed_level: null,
        });
        svc.confirmLevel.mockResolvedValue({ confirmed_level: "A2" });
        renderAt();
        await userEvent.click(await screen.findByRole("button", { name: /yes, a bit/i }));
        // Vocab page renders; match all 5 pairs by clicking each question then its answer.
        // The shuffled-answers column may reorder, so click by visible text.
        for (let i = 1; i <= 5; i++) {
            await userEvent.click(screen.getByRole("button", { name: `q${i}` }));
            await userEvent.click(screen.getByRole("button", { name: `a${i}` }));
        }
        await userEvent.click(screen.getByRole("button", { name: /check level/i }));
        // Sentence step renders; place the words in order.
        await userEvent.click(await screen.findByRole("button", { name: /^yo$/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^como$/ }));
        await userEvent.click(await screen.findByRole("button", { name: /^manzanas$/ }));
        await userEvent.click(screen.getByRole("button", { name: /check level/i }));
        // Confirm screen renders the recommendation.
        expect(await screen.findByText(/we recommend a1/i)).toBeInTheDocument();
        // Choose the +1 override.
        await userEvent.click(screen.getByRole("radio", { name: /start at a2 instead/i }));
        await userEvent.click(screen.getByRole("button", { name: /start learning/i }));
        await waitFor(() => expect(screen.getByText("DASHBOARD")).toBeInTheDocument());
        expect(svc.confirmLevel).toHaveBeenCalledWith("s1", "A2");
        expect(overrideEvents).toContain("placement_level_override_used");
    });
});
