import { SlidingNumber } from "@/components/animate-ui/primitives/texts/sliding-number";
import { GameStats } from "@/interfaces/game";
import { getSuccessRate } from "@/lib/stats";
import { statsCopy } from "@/lib/copy";

type Props = {
  gameStats: GameStats | undefined;
};

type StatCardProps = {
  label: string;
  value: number;
  suffix?: string;
  delay?: number;
};

const StatCard = ({ label, value, suffix, delay = 0 }: StatCardProps) => (
  <div className="surface-panel flex h-24 flex-col items-center justify-center px-3 py-3 text-center">
    <div className="inline-flex items-end justify-center gap-0.5 leading-none text-foreground">
      <SlidingNumber
        number={value}
        fromNumber={0}
        delay={delay}
        className="font-mono text-[1.8rem] font-semibold tracking-tight tabular-nums"
      />
      {suffix && (
        <span className="pb-[2px] font-mono text-base font-semibold tabular-nums">
          {suffix}
        </span>
      )}
    </div>
    <div className="text-[10px] leading-none uppercase tracking-[0.08em] text-muted-foreground">
      {label}
    </div>
  </div>
);

export function StatsHeader({ gameStats }: Props) {
  const successRateTarget = gameStats ? getSuccessRate(gameStats) : 0;

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
      <StatCard
        label={statsCopy.games}
        value={gameStats?.games ?? 0}
        delay={0}
      />
      <StatCard
        label={statsCopy.wins}
        value={gameStats?.wins ?? 0}
        delay={50}
      />
      <StatCard
        label={statsCopy.failed}
        value={gameStats?.failed ?? 0}
        delay={100}
      />
      <StatCard
        label={statsCopy.successRate}
        value={successRateTarget}
        suffix="%"
        delay={150}
      />
      <StatCard
        label={statsCopy.currentStreak}
        value={gameStats?.curstreak ?? 0}
        delay={200}
      />
      <StatCard
        label={statsCopy.bestStreak}
        value={gameStats?.maxstreak ?? 0}
        delay={250}
      />
      <StatCard
        label={statsCopy.perfectWins}
        value={gameStats?.perfectWins ?? 0}
        delay={300}
      />
      <StatCard
        label={statsCopy.currentPerfectStreak}
        value={gameStats?.currentPerfectStreak ?? 0}
        delay={350}
      />
      <StatCard
        label={statsCopy.bestPerfectStreak}
        value={gameStats?.bestPerfectStreak ?? 0}
        delay={400}
      />
    </div>
  );
}
