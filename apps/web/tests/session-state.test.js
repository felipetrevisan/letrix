import { describe, expect, it } from "bun:test";
import {
  buildEmptyGameState,
  buildGameStateSnapshot,
  hydrateInfiniteSolutionFromState,
  hydrateStandardSolutionFromState,
  resolveInfiniteBootstrapState,
} from "../src/features/game/session/state";

const fallbackSolution = {
  solution: ["casa"],
  displaySolution: ["casa"],
  solutionDate: new Date("2026-02-26T00:00:00.000Z"),
  solutionIndex: 100,
  tomorrow: new Date("2026-02-27T00:00:00.000Z").valueOf(),
  language: "pt",
};

describe("session state", () => {
  it("hydrates infinite solution from persisted state", () => {
    const savedState = [
      {
        curday: 107,
        curRow: 2,
        curTry: "teste",
        tries: ["teste", "nivel"],
        invalids: [],
        solution: "nacao",
        displaySolution: "nação",
        gameOver: false,
        won: false,
      },
    ];

    const hydrated = hydrateInfiniteSolutionFromState(
      fallbackSolution,
      savedState,
    );

    expect(hydrated.solutionIndex).toBe(107);
    expect(hydrated.solution[0]).toBe("nacao");
    expect(hydrated.displaySolution[0]).toBe("nação");
    expect(hydrated.solutionDate.toISOString().slice(0, 10)).toBe("2026-03-05");
  });

  it("creates empty game state for a new round", () => {
    const emptyState = buildEmptyGameState(fallbackSolution);

    expect(emptyState).toHaveLength(1);
    expect(emptyState[0].tries).toEqual([]);
    expect(emptyState[0].curRow).toBe(0);
    expect(emptyState[0].gameOver).toBe(false);
  });

  it("builds snapshot with normal-mode loss and unlimited-mode win correctly", () => {
    const normalLoss = buildGameStateSnapshot({
      stateSolutions: fallbackSolution,
      nextTries: ["a", "b", "c", "d", "e", "f"],
      currentTry: "f",
      row: 5,
      invalids: [],
      isWin: false,
      isUnlimitedMode: false,
      maxChallenges: 6,
    });

    expect(normalLoss[0].gameOver).toBe(true);
    expect(normalLoss[0].won).toBe(false);

    const infiniteWin = buildGameStateSnapshot({
      stateSolutions: fallbackSolution,
      nextTries: ["casa"],
      currentTry: "casa",
      row: 0,
      invalids: [],
      isWin: true,
      isUnlimitedMode: true,
      maxChallenges: 6,
    });

    expect(infiniteWin[0].gameOver).toBe(false);
    expect(infiniteWin[0].won).toBe(false);
  });

  it("resolves infinite bootstrap state and detects next round transition", () => {
    const savedState = [
      {
        curday: 100,
        curRow: 1,
        curTry: "casa",
        tries: ["casa"],
        invalids: [],
        solution: "casa",
        displaySolution: "casa",
        gameOver: false,
        won: false,
      },
    ];

    const result = resolveInfiniteBootstrapState({
      baseSolutions: fallbackSolution,
      savedState,
    });

    expect(result.hasSavedState).toBe(true);
    expect(result.savedTries).toEqual(["casa"]);
    expect(result.restoredSolutions.solution[0]).toBe("casa");
    expect(result.shouldAdvanceToNextRound).toBe(true);
  });

  it("hydrates standard solution from saved state for the same day", () => {
    const savedState = [
      {
        curday: 100,
        curRow: 1,
        curTry: "nacao",
        tries: ["nacao"],
        invalids: [],
        solution: "nacao",
        displaySolution: "nação",
        definition: "país organizado politicamente",
        gameOver: false,
        won: true,
      },
    ];

    const hydrated = hydrateStandardSolutionFromState(
      fallbackSolution,
      savedState,
      {
        boards: 1,
        wordLength: 5,
      },
    );

    expect(hydrated?.solution[0]).toBe("nacao");
    expect(hydrated?.displaySolution[0]).toBe("nação");
    expect(hydrated?.definitions[0]).toBe("país organizado politicamente");
    expect(hydrated?.tomorrow).toBe(fallbackSolution.tomorrow);
  });
});
