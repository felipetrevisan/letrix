import { describe, expect, it } from "bun:test";
import { addStatsForCompletedGame, normalizeStats } from "../src/lib/stats";

describe("stats", () => {
  it("tracks perfect wins and streak reset correctly", () => {
    const initial = normalizeStats(null, 6);

    const afterPerfectWin = addStatsForCompletedGame(initial, 0, 6);
    expect(afterPerfectWin.games).toBe(1);
    expect(afterPerfectWin.wins).toBe(1);
    expect(afterPerfectWin.perfectWins).toBe(1);
    expect(afterPerfectWin.currentPerfectStreak).toBe(1);
    expect(afterPerfectWin.bestPerfectStreak).toBe(1);

    const afterRegularWin = addStatsForCompletedGame(afterPerfectWin, 2, 6);
    expect(afterRegularWin.games).toBe(2);
    expect(afterRegularWin.wins).toBe(2);
    expect(afterRegularWin.perfectWins).toBe(1);
    expect(afterRegularWin.currentPerfectStreak).toBe(0);
    expect(afterRegularWin.bestPerfectStreak).toBe(1);

    const afterFailure = addStatsForCompletedGame(afterRegularWin, 6, 6);
    expect(afterFailure.games).toBe(3);
    expect(afterFailure.failed).toBe(1);
    expect(afterFailure.curstreak).toBe(0);
    expect(afterFailure.currentPerfectStreak).toBe(0);
  });

  it("treats high-attempt wins as valid in unlimited mode", () => {
    const initial = normalizeStats(null, 6);
    const result = addStatsForCompletedGame(initial, 22, 6, {
      isUnlimitedMode: true,
    });

    expect(result.games).toBe(1);
    expect(result.wins).toBe(1);
    expect(result.failed).toBe(0);
    expect(result.histo[22]).toBe(1);
  });
});
