"use client";

import Countdown from "react-countdown";
import { Clock3, Trophy } from "lucide-react";
import { StatsHeader } from "@/features/stats/components/stats-header";
import { StatsHistogram } from "@/features/stats/components/stats-histogram";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGame } from "@/contexts/GameContext";
import { GameStats } from "@/interfaces/game";
import { statsCopy } from "@/lib/copy";
import { getSuccessRate } from "@/lib/stats";
import { Base } from "@/features/shared/components/dialog-base";

type Props = {
  isOpen: boolean;
  solution: string;
  gameStats: GameStats;
  isLatestGame: boolean;
  isGameOver: boolean;
  isGameWon: boolean;
  handleClose: () => void;
};

export function StatsModal({
  isOpen,
  handleClose,
  gameStats,
  isLatestGame,
  isGameOver,
  isGameWon,
}: Props) {
  const { solutions, guesses, getMaxChallenges } = useGame();
  const perfectRate = gameStats.wins
    ? Math.round((gameStats.perfectWins / gameStats.wins) * 100)
    : 0;
  const successRate = getSuccessRate(gameStats);
  const solvedBoards = solutions.solution.reduce((count, word) => {
    return guesses.some((guess) => guess.word === word) ? count + 1 : count;
  }, 0);
  const attemptsUsed = guesses.length;
  const attemptsLeft = Math.max(getMaxChallenges() - attemptsUsed, 0);

  return (
    <Base
      title={statsCopy.title}
      isOpen={isOpen}
      showHeader
      handleClose={handleClose}
      contentScrollable
      className="max-w-4xl"
    >
      <div className="space-y-4">
        <StatsHeader gameStats={gameStats} />

        <section className="grid grid-cols-1 gap-3 rounded-xl border border-border/65 bg-background/80 p-4 md:grid-cols-3">
          <article className="rounded-lg border border-border/55 bg-muted/35 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              precisão total
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {successRate}%
            </p>
          </article>

          <article className="rounded-lg border border-border/55 bg-muted/35 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              precisão sem erro
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {perfectRate}%
            </p>
          </article>

          <article className="rounded-lg border border-border/55 bg-muted/35 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              recorde perfeito
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {gameStats.bestPerfectStreak}
            </p>
          </article>
        </section>

        <section className="grid grid-cols-1 gap-3 rounded-xl border border-border/65 bg-background/80 p-4 md:grid-cols-3">
          <article className="rounded-lg border border-border/55 bg-muted/35 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              sessão atual
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {attemptsUsed}
            </p>
            <p className="text-xs text-muted-foreground">tentativas usadas</p>
          </article>

          <article className="rounded-lg border border-border/55 bg-muted/35 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              tabuleiros resolvidos
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {solvedBoards}/{solutions.solution.length}
            </p>
            <p className="text-xs text-muted-foreground">
              progresso desta rodada
            </p>
          </article>

          <article className="rounded-lg border border-border/55 bg-muted/35 p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              tentativas restantes
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {attemptsLeft}
            </p>
            <p className="text-xs text-muted-foreground">antes de encerrar</p>
          </article>
        </section>

        <section className="rounded-xl border border-border/65 bg-background/80 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
            <Trophy className="size-4" />
            {statsCopy.guessDistributionTitle}
          </h3>

          <ScrollArea className="h-[min(42vh,18rem)] pr-2">
            <StatsHistogram
              isLatestGame={isLatestGame}
              isGameWon={isGameWon}
              gameStats={gameStats}
              numberOfGuessesMade={guesses.length}
            />
          </ScrollArea>
        </section>

        {(isGameOver || isGameWon) && isLatestGame && (
          <section className="flex flex-col items-center justify-center pt-1 text-center">
            <h3 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
              <Clock3 className="size-4" />
              {statsCopy.nextWordIn}
            </h3>
            <Countdown
              date={solutions.tomorrow}
              daysInHours={true}
              className="font-mono text-5xl font-semibold leading-none tracking-tight text-foreground tabular-nums md:text-6xl"
            />
          </section>
        )}
      </div>
    </Base>
  );
}
