import type { GameStats } from "@/interfaces/game";
import { getSuccessRate, normalizeStats } from "@/lib/stats";

export type StatsAchievement = {
  id: string;
  label: string;
  description: string;
  unlocked: boolean;
  category: "normal" | "secret";
};

export type StatsInsights = {
  successRate: number;
  failureRate: number;
  perfectRate: number;
  averageWinAttempts: number;
  averageAttemptsLabel: string;
  totalAttemptsInWins: number;
  achievements: StatsAchievement[];
};

const toOneDecimal = (value: number) => {
  return Math.round(value * 10) / 10;
};

const buildAchievement = (
  id: string,
  label: string,
  description: string,
  unlocked: boolean,
  category: "normal" | "secret" = "normal",
): StatsAchievement => ({
  id,
  label,
  description,
  unlocked,
  category,
});

export const deriveStatsInsights = (
  gameStats: Partial<GameStats> | null | undefined,
  maxChallenges: number,
): StatsInsights => {
  const stats = normalizeStats(gameStats, maxChallenges);
  const successRate = getSuccessRate(stats);
  const failureRate = Math.max(0, 100 - successRate);
  const perfectRate = stats.wins
    ? Math.round((stats.perfectWins / stats.wins) * 100)
    : 0;
  const totalAttemptsInWins = stats.histo.reduce((total, wins, index) => {
    return total + wins * (index + 1);
  }, 0);
  const averageWinAttempts = stats.wins
    ? toOneDecimal(totalAttemptsInWins / stats.wins)
    : 0;

  const achievements: StatsAchievement[] = [
    buildAchievement(
      "first-win",
      "Primeira vitória",
      "Vença ao menos uma rodada.",
      stats.wins >= 1,
    ),
    buildAchievement(
      "five-wins",
      "Aquecido",
      "Acumule 5 vitórias.",
      stats.wins >= 5,
    ),
    buildAchievement(
      "ten-wins",
      "Embalado",
      "Acumule 10 vitórias.",
      stats.wins >= 10,
    ),
    buildAchievement(
      "twenty-five-wins",
      "Consistente",
      "Acumule 25 vitórias.",
      stats.wins >= 25,
    ),
    buildAchievement(
      "fifty-wins",
      "Veterano",
      "Acumule 50 vitórias.",
      stats.wins >= 50,
    ),
    buildAchievement(
      "hundred-wins",
      "Lenda diária",
      "Acumule 100 vitórias.",
      stats.wins >= 100,
    ),
    buildAchievement(
      "first-perfect",
      "Primeiro perfeito",
      "Vença uma rodada sem errar.",
      stats.perfectWins >= 1,
    ),
    buildAchievement(
      "perfect-five",
      "Precisão cirúrgica",
      "Conquiste 5 vitórias perfeitas.",
      stats.perfectWins >= 5,
    ),
    buildAchievement(
      "perfect-ten",
      "Perfeccionista",
      "Conquiste 10 vitórias perfeitas.",
      stats.perfectWins >= 10,
    ),
    buildAchievement(
      "streak-three",
      "No embalo",
      "Alcance 3 vitórias seguidas.",
      stats.maxstreak >= 3,
    ),
    buildAchievement(
      "streak-seven",
      "Sequência quente",
      "Alcance 7 vitórias seguidas.",
      stats.maxstreak >= 7,
    ),
    buildAchievement(
      "streak-fifteen",
      "Imparável",
      "Alcance 15 vitórias seguidas.",
      stats.maxstreak >= 15,
    ),
    buildAchievement(
      "perfect-streak-three",
      "Mão gelada",
      "Faça 3 vitórias perfeitas em sequência.",
      stats.bestPerfectStreak >= 3,
    ),
    buildAchievement(
      "perfect-streak-five",
      "Sem margem de erro",
      "Faça 5 vitórias perfeitas em sequência.",
      stats.bestPerfectStreak >= 5,
    ),
    buildAchievement(
      "steady-hand",
      "Mão firme",
      "Mantenha 80% de vitórias em pelo menos 20 jogos.",
      stats.games >= 20 && successRate >= 80,
    ),
    buildAchievement(
      "elite-rate",
      "Elite",
      "Mantenha 90% de vitórias em pelo menos 40 jogos.",
      stats.games >= 40 && successRate >= 90,
    ),
    buildAchievement(
      "efficient-solver",
      "Solver econômico",
      "Mantenha média de 3.0 ou menos em pelo menos 15 vitórias.",
      stats.wins >= 15 && averageWinAttempts <= 3,
    ),
    buildAchievement(
      "surgical-solver",
      "Solver cirúrgico",
      "Mantenha média de 2.5 ou menos em pelo menos 30 vitórias.",
      stats.wins >= 30 && averageWinAttempts <= 2.5,
    ),
    buildAchievement(
      "marathon-25",
      "Ritmo forte",
      "Jogue 25 partidas.",
      stats.games >= 25,
    ),
    buildAchievement(
      "marathon",
      "Maratonista",
      "Jogue 50 partidas.",
      stats.games >= 50,
    ),
    buildAchievement(
      "marathon-100",
      "Incansável",
      "Jogue 100 partidas.",
      stats.games >= 100,
    ),
    buildAchievement(
      "secret-perfect-storm",
      "Tempestade perfeita",
      "Conquiste 20 vitórias perfeitas.",
      stats.perfectWins >= 20,
      "secret",
    ),
    buildAchievement(
      "secret-frozen-hand",
      "Mão congelada",
      "Alcance 7 vitórias perfeitas em sequência.",
      stats.bestPerfectStreak >= 7,
      "secret",
    ),
    buildAchievement(
      "secret-untouchable",
      "Intocável",
      "Mantenha 95% de vitórias em pelo menos 100 jogos.",
      stats.games >= 100 && successRate >= 95,
      "secret",
    ),
    buildAchievement(
      "secret-machine",
      "Máquina de resolver",
      "Mantenha média de 2.2 ou menos em pelo menos 75 vitórias.",
      stats.wins >= 75 && averageWinAttempts <= 2.2,
      "secret",
    ),
    buildAchievement(
      "secret-immortal-streak",
      "Sequência imortal",
      "Alcance 30 vitórias seguidas.",
      stats.maxstreak >= 30,
      "secret",
    ),
  ];

  return {
    successRate,
    failureRate,
    perfectRate,
    averageWinAttempts,
    averageAttemptsLabel: stats.wins ? averageWinAttempts.toFixed(1) : "0.0",
    totalAttemptsInWins,
    achievements,
  };
};

export const getNewlyUnlockedAchievements = (
  previousStats: Partial<GameStats> | null | undefined,
  nextStats: Partial<GameStats> | null | undefined,
  maxChallenges: number,
) => {
  const previousAchievements = new Map(
    deriveStatsInsights(previousStats, maxChallenges).achievements.map(
      (achievement) => [achievement.id, achievement.unlocked],
    ),
  );

  return deriveStatsInsights(nextStats, maxChallenges).achievements.filter(
    (achievement) =>
      achievement.unlocked && !previousAchievements.get(achievement.id),
  );
};
