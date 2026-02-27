import { initialStats } from "@/config/game";
import { GameStats } from "@/interfaces/game";
import { StatsProgress } from "@/features/stats/components/stats-progress";

type Props = {
  gameStats: GameStats;
  isLatestGame: boolean;
  isGameWon: boolean;
  numberOfGuessesMade: number;
};

const isCurrentDayStatRow = (
  isLatestGame: boolean,
  isGameWon: boolean,
  numberOfGuessesMade: number,
  i: number,
) => isLatestGame && isGameWon && numberOfGuessesMade === i + 1;

export function StatsHistogram({
  gameStats,
  isLatestGame,
  isGameWon,
  numberOfGuessesMade,
}: Props) {
  const winDistribution = gameStats?.histo ?? initialStats.histo;
  const maxValue = Math.max(...winDistribution, gameStats.failed, 1);

  return (
    <div className="space-y-2 py-1">
      {winDistribution.map((value: number, i: number) => (
        <StatsProgress
          key={i}
          index={i}
          isCurrentDayStatRow={isCurrentDayStatRow(
            isLatestGame,
            isGameWon,
            numberOfGuessesMade,
            i,
          )}
          size={100 * (value / maxValue)}
          label={String(value)}
        />
      ))}
      <StatsProgress
        index={-1}
        isCurrentDayStatRow={false}
        size={100 * (gameStats.failed / maxValue)}
        label={String(gameStats.failed)}
      />
    </div>
  );
}
