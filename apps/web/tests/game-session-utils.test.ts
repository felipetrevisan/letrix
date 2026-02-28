import { describe, expect, test } from "bun:test";
import { resolveInfiniteBootstrapState } from "../src/features/game/session/state";
import { buildSubmissionSnapshot } from "../src/features/game/session/submission";
import type { GameState, Solution } from "../src/interfaces/game";

const fallbackSolution: Solution = {
  solutionIndex: 100,
  solutionDate: new Date("2026-02-28T00:00:00.000Z"),
  tomorrow: new Date("2026-03-01T00:00:00.000Z").valueOf(),
  solution: ["carta"],
  displaySolution: ["carta"],
  definitions: ["Carta de baralho ou mensagem escrita."],
  language: "pt",
};

describe("game session utils", () => {
  test("submission snapshot marks win only when all solutions are solved", () => {
    const result = buildSubmissionSnapshot({
      currentGuessWord: "termo",
      solutionLength: 5,
      guessesWords: ["carta"],
      solutions: ["carta", "termo"],
      maxChallenges: 8,
      isGameWon: false,
    });

    expect(result.canSaveGuess).toBe(true);
    expect(result.gameWonNow).toBe(true);
    expect(result.reachedModeLimit).toBe(false);
    expect(result.nextTries).toEqual(["carta", "termo"]);
    expect(result.attemptsUsed).toBe(1);
  });

  test("submission snapshot detects mode limit on final failed try", () => {
    const result = buildSubmissionSnapshot({
      currentGuessWord: "zzzzz",
      solutionLength: 5,
      guessesWords: ["aaaaa", "bbbbb", "ccccc", "ddddd", "eeeee"],
      solutions: ["carta"],
      maxChallenges: 6,
      isGameWon: false,
    });

    expect(result.gameWonNow).toBe(false);
    expect(result.reachedModeLimit).toBe(true);
    expect(result.canSaveGuess).toBe(true);
  });

  test("infinite bootstrap advances to next round when saved tries already solved the board", () => {
    const savedState: GameState[] = [
      {
        curday: 101,
        curRow: 1,
        curTry: "",
        tries: ["livro"],
        invalids: [],
        solution: "livro",
        displaySolution: "livro",
        definition: "Conjunto de folhas encadernadas.",
        gameOver: false,
        won: true,
      },
    ];

    const result = resolveInfiniteBootstrapState({
      baseSolutions: fallbackSolution,
      savedState,
    });

    expect(result.hasSavedState).toBe(true);
    expect(result.savedTries).toEqual(["livro"]);
    expect(result.shouldAdvanceToNextRound).toBe(true);
    expect(result.restoredSolutions.solution).toEqual(["livro"]);
    expect(result.restoredSolutions.solutionIndex).toBe(101);
  });
});
