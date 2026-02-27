import { gameSettings } from "@/config/game";
import { loadStatsFromLocalStorage } from "./localStorage";
import { GameMode, GameStats } from "@/interfaces/game";

export function normalizeStats(
  gameStats: Partial<GameStats> | null | undefined,
  maxChallenges: number,
): GameStats {
  const histoLength = Math.max(maxChallenges, 6);
  const sourceHisto = Array.isArray(gameStats?.histo) ? gameStats.histo : [];
  const histo = Array.from(
    { length: histoLength },
    (_, index) => sourceHisto[index] ?? 0,
  );

  return {
    histo,
    failed: gameStats?.failed ?? 0,
    curstreak: gameStats?.curstreak ?? 0,
    maxstreak: gameStats?.maxstreak ?? 0,
    games: gameStats?.games ?? 0,
    wins: gameStats?.wins ?? 0,
    perfectWins: gameStats?.perfectWins ?? 0,
    currentPerfectStreak: gameStats?.currentPerfectStreak ?? 0,
    bestPerfectStreak: gameStats?.bestPerfectStreak ?? 0,
  };
}

export function addStatsForCompletedGame(
  gameStats: GameStats,
  count: number,
  maxChallenges: number,
  options?: { isUnlimitedMode?: boolean },
) {
  const stats = normalizeStats(gameStats, maxChallenges);
  const histIndex = Math.max(0, count);
  const isFailure = !options?.isUnlimitedMode && count >= maxChallenges;
  const isPerfectWin = !isFailure && count === 0;

  if (histIndex >= stats.histo.length) {
    stats.histo.push(
      ...Array.from({ length: histIndex - stats.histo.length + 1 }, () => 0),
    );
  }

  stats.games += 1;

  if (isFailure) {
    stats.curstreak = 0;
    stats.currentPerfectStreak = 0;
    stats.failed += 1;
  } else {
    stats.histo[histIndex] += 1;
    stats.curstreak += 1;
    stats.wins += 1;

    if (stats.maxstreak < stats.curstreak) {
      stats.maxstreak = stats.curstreak;
    }

    if (isPerfectWin) {
      stats.perfectWins += 1;
      stats.currentPerfectStreak += 1;

      if (stats.bestPerfectStreak < stats.currentPerfectStreak) {
        stats.bestPerfectStreak = stats.currentPerfectStreak;
      }
    } else {
      stats.currentPerfectStreak = 0;
    }
  }

  return stats;
}

export function loadStats(gameMode: GameMode, storageKey?: string) {
  const key = storageKey ?? gameSettings[gameMode].name;
  const loadedStats = loadStatsFromLocalStorage(key);
  return normalizeStats(loadedStats, gameSettings[gameMode].maxChallenges);
}

export function getSuccessRate(gameStats: GameStats) {
  const { games, failed } = gameStats;

  return Math.round((100 * (games - failed)) / Math.max(games, 1));
}
