import { describe, expect, test } from "bun:test";
import { deriveStatsInsights } from "@/features/stats/lib/stats-insights";

describe("stats insights", () => {
  test("derives rates, average attempts and unlocked achievements", () => {
    const insights = deriveStatsInsights(
      {
        games: 24,
        wins: 20,
        failed: 4,
        curstreak: 6,
        maxstreak: 8,
        perfectWins: 5,
        currentPerfectStreak: 2,
        bestPerfectStreak: 4,
        histo: [3, 5, 7, 3, 2, 0],
      },
      6,
    );

    expect(insights.successRate).toBe(83);
    expect(insights.failureRate).toBe(17);
    expect(insights.perfectRate).toBe(25);
    expect(insights.averageAttemptsLabel).toBe("2.8");
    expect(
      insights.achievements.find((achievement) => achievement.id === "ten-wins")
        ?.unlocked,
    ).toBe(true);
    expect(
      insights.achievements.find(
        (achievement) => achievement.id === "steady-hand",
      )?.unlocked,
    ).toBe(true);
    expect(insights.achievements.length >= 20).toBe(true);
    expect(
      insights.achievements.find(
        (achievement) => achievement.id === "five-wins",
      )?.unlocked,
    ).toBe(true);
    expect(
      insights.achievements.some(
        (achievement) => achievement.category === "secret",
      ),
    ).toBe(true);
  });

  test("keeps achievements pending when stats are low", () => {
    const insights = deriveStatsInsights(
      {
        games: 2,
        wins: 1,
        failed: 1,
        curstreak: 1,
        maxstreak: 1,
        perfectWins: 0,
        currentPerfectStreak: 0,
        bestPerfectStreak: 0,
        histo: [0, 1, 0, 0, 0, 0],
      },
      6,
    );

    expect(insights.successRate).toBe(50);
    expect(insights.averageAttemptsLabel).toBe("2.0");
    expect(
      insights.achievements.find(
        (achievement) => achievement.id === "first-win",
      )?.unlocked,
    ).toBe(true);
    expect(
      insights.achievements.find((achievement) => achievement.id === "marathon")
        ?.unlocked,
    ).toBe(false);
    expect(
      insights.achievements.find(
        (achievement) => achievement.id === "five-wins",
      )?.unlocked,
    ).toBe(false);
    expect(
      insights.achievements.find(
        (achievement) => achievement.id === "secret-perfect-storm",
      )?.unlocked,
    ).toBe(false);
  });
});
