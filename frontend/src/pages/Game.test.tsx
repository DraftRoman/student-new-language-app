import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import Game from "./Game";

vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../lib/progressService", () => ({ saveWordResult: vi.fn(() => Promise.resolve()) }));

// 30 distinct words; every request returns them in a different order.
const WORDS = Array.from({ length: 30 }, (_, i) => ({ question: `q${i}`, answer: `a${i}` }));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({
    ok:   true,
    json: async () => ({ pairs: [...WORDS].sort(() => Math.random() - 0.5).slice(0, 20), imageMode: null }),
  })));
});

function renderGame() {
  return render(
    <MemoryRouter initialEntries={["/game"]}>
      <Routes>
        <Route path="/game" element={<Game />} />
        <Route path="/sentence-builder" element={<p>Sentence page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function solveScreen(user: ReturnType<typeof userEvent.setup>, seen: Set<string>) {
  const questions = await screen.findAllByRole("button", { name: /^q\d+$/ });
  for (const q of questions) {
    const word = q.textContent!;
    seen.add(word);
    await user.click(q);
    await user.click(screen.getByRole("button", { name: word.replace("q", "a") }));
  }
}

describe("Word Match game", () => {
  it("plays 5 screens of new words, then shows the score with both buttons", async () => {
    const user = userEvent.setup();
    renderGame();
    const seen = new Set<string>();

    for (let i = 1; i <= 5; i++) {
      await screen.findByText(`Screen ${i} / 5`, {}, { timeout: 3000 });
      // one wrong match on the first screen
      if (i === 1) {
        const [q0, q1] = await screen.findAllByRole("button", { name: /^q\d+$/ });
        await user.click(q0);
        await user.click(screen.getByRole("button", { name: q1.textContent!.replace("q", "a") }));
      }
      await solveScreen(user, seen);
    }

    expect(seen.size).toBe(25); // no word repeated across screens
    await screen.findByText("Well done!", {}, { timeout: 3000 });
    expect(screen.getByText(/Accuracy: 96%/)).toBeInTheDocument(); // 25 right, 1 wrong
    expect(screen.queryByText(/Screen \d \/ 5/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Start over/ }));
    await screen.findByText("Screen 1 / 5");
    expect(screen.getByText("🏆 Score: 0")).toBeInTheDocument();
  }, 30000);

  it("'Go to sentences' opens the sentence builder", async () => {
    const user = userEvent.setup();
    renderGame();
    const seen = new Set<string>();
    for (let i = 1; i <= 5; i++) {
      await screen.findByText(`Screen ${i} / 5`, {}, { timeout: 3000 });
      await solveScreen(user, seen);
    }
    await user.click(await screen.findByRole("button", { name: /Go to sentences/ }, { timeout: 3000 }));
    await waitFor(() => expect(screen.getByText("Sentence page")).toBeInTheDocument());
  }, 30000);
});
