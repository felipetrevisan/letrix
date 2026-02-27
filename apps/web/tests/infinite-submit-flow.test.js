import { describe, expect, it } from "bun:test";
import { normalizeStats, addStatsForCompletedGame } from "../src/lib/stats";
import { buildEmptyGameState } from "../src/features/game/session/state";
import { buildSubmissionSnapshot } from "../src/features/game/session/submission";

const currentRoundSolutions = {
  solution: ["casa"],
  displaySolution: ["casa"],
  solutionDate: new Date("2026-02-26T00:00:00.000Z"),
  solutionIndex: 100,
  tomorrow: new Date("2026-02-27T00:00:00.000Z").valueOf(),
  language: "pt",
};

const nextRoundSolutions = {
  solution: ["piano"],
  displaySolution: ["piano"],
  solutionDate: new Date("2026-02-27T00:00:00.000Z"),
  solutionIndex: 101,
  tomorrow: new Date("2026-02-28T00:00:00.000Z").valueOf(),
  language: "pt",
};

describe("infinite submit flow", () => {
  it("handles win submission and prepares next round state", () => {
    const snapshot = buildSubmissionSnapshot({
      currentGuessWord: "casa",
      solutionLength: 4,
      guessesWords: [],
      solutions: currentRoundSolutions.solution,
      maxChallenges: 6,
      isGameWon: false,
    });

    expect(snapshot.canSaveGuess).toBe(true);
    expect(snapshot.gameWonNow).toBe(true);
    expect(snapshot.reachedModeLimit).toBe(false);
    expect(snapshot.nextTries).toEqual(["casa"]);

    const initialStats = normalizeStats(null, 6);
    const nextStats = addStatsForCompletedGame(
      initialStats,
      snapshot.attemptsUsed,
      6,
      {
        isUnlimitedMode: true,
      },
    );

    expect(nextStats.games).toBe(1);
    expect(nextStats.wins).toBe(1);
    expect(nextStats.perfectWins).toBe(1);

    const resetState = buildEmptyGameState(nextRoundSolutions);

    expect(resetState).toHaveLength(1);
    expect(resetState[0].solution).toBe("piano");
    expect(resetState[0].tries).toEqual([]);
    expect(resetState[0].curday).toBe(101);
  });

  it("bloqueia quando atinge o limite de tentativas da rodada", () => {
    const snapshot = buildSubmissionSnapshot({
      currentGuessWord: "abcde",
      solutionLength: 5,
      guessesWords: Array.from({ length: 12 }, () => "xxxxx"),
      solutions: ["canto"],
      maxChallenges: 6,
      isGameWon: false,
    });

    expect(snapshot.canSaveGuess).toBe(false);
    expect(snapshot.reachedModeLimit).toBe(false);
    expect(snapshot.gameWonNow).toBe(false);
  });
});
