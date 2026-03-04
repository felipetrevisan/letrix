"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import Countdown from "react-countdown";
import { usePathname } from "next/navigation";
import { Clock3, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatsHeader } from "@/features/stats/components/stats-header";
import { StatsHistogram } from "@/features/stats/components/stats-histogram";
import { ScrollArea } from "@/components/ui/scroll-area";
import { createFadeUpMotion, staggerDelay } from "@/config/motion-variants";
import { useApp } from "@/contexts/AppContext";
import {
  loadDailyLeaderboard,
  type DailyLeaderboardEntry,
} from "@/features/auth/lib/game-storage";
import { useGame } from "@/contexts/GameContext";
import { GameLanguage, GameStats } from "@/interfaces/game";
import { statsCopy } from "@/lib/copy";
import { deriveStatsInsights } from "@/features/stats/lib/stats-insights";
import {
  buildShareResultText,
  shareGameResult,
} from "@/features/stats/lib/share-result";
import { Base } from "@/features/shared/components/dialog-base";

type Props = {
  isOpen: boolean;
  solution: string;
  gameStats: GameStats;
  isLatestGame: boolean;
  isGameOver: boolean;
  isGameWon: boolean;
  isPracticeMode?: boolean;
  isInfiniteMode?: boolean;
  modeName: string;
  language: GameLanguage;
  puzzleDate: string;
  onOpenAchievements?: () => void;
  onRequestNewPracticeRound?: () => void | Promise<void>;
  handleClose: () => void;
};

export function StatsModal({
  isOpen,
  handleClose,
  gameStats,
  isLatestGame,
  isGameOver,
  isGameWon,
  isPracticeMode = false,
  isInfiniteMode = false,
  modeName,
  language,
  puzzleDate,
  onOpenAchievements,
  onRequestNewPracticeRound,
}: Props) {
  const pathname = usePathname();
  const { user } = useApp();
  const { solutions, guesses, getMaxChallenges } = useGame();
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [leaderboard, setLeaderboard] = useState<DailyLeaderboardEntry[]>([]);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const insights = useMemo(
    () => deriveStatsInsights(gameStats, getMaxChallenges()),
    [gameStats, getMaxChallenges],
  );
  const solvedBoards = solutions.solution.reduce((count, word) => {
    return guesses.some((guess) => guess.word === word) ? count + 1 : count;
  }, 0);
  const attemptsUsed = guesses.length;
  const attemptsLeft = Math.max(getMaxChallenges() - attemptsUsed, 0);
  const canShareResult = isGameOver || isGameWon;
  const canShowDailyLeaderboard = !isPracticeMode && !isInfiniteMode;
  const canChallengeFriend = !isPracticeMode && !isInfiniteMode;

  useEffect(() => {
    if (!isOpen || !canShowDailyLeaderboard) {
      return;
    }

    let isMounted = true;

    const loadLeaderboard = async () => {
      setIsLoadingLeaderboard(true);
      const nextLeaderboard = await loadDailyLeaderboard({
        language,
        modeName,
        puzzleDate,
      });

      if (isMounted) {
        setLeaderboard(nextLeaderboard);
        setIsLoadingLeaderboard(false);
      }
    };

    void loadLeaderboard();

    return () => {
      isMounted = false;
    };
  }, [canShowDailyLeaderboard, isOpen, language, modeName, puzzleDate]);

  const handleShare = async () => {
    const shareTitle = isPracticeMode ? "Letrix Prática" : "Letrix";
    const shareText = buildShareResultText({
      modeName,
      puzzleDate,
      guesses,
      solutions: solutions.solution,
      maxChallenges: getMaxChallenges(),
      currentStreak: gameStats.curstreak,
      isPracticeMode,
      isInfiniteMode,
    });

    try {
      const result = await shareGameResult({
        title: shareTitle,
        text: shareText,
      });

      toast.success(
        result === "copied"
          ? "Resultado copiado para a área de transferência."
          : "Resultado compartilhado.",
      );
    } catch {
      toast.error("Não foi possível compartilhar o resultado agora.");
    }
  };

  const handleChallengeFriend = async () => {
    if (!canChallengeFriend || typeof window === "undefined") {
      return;
    }

    const challengeUrl = `${window.location.origin}${pathname}?challenge=${puzzleDate}`;
    const challengeText = [
      `Desafio Letrix: ${modeName}`,
      `Tente resolver a mesma rodada do dia ${puzzleDate}.`,
    ].join("\n");

    try {
      const result = await shareGameResult({
        title: "Desafio Letrix",
        text: challengeText,
        url: challengeUrl,
      });

      toast.success(
        result === "copied"
          ? "Link do desafio copiado."
          : "Desafio compartilhado.",
      );
    } catch {
      toast.error("Não foi possível compartilhar o desafio agora.");
    }
  };

  return (
    <Base
      title={statsCopy.title}
      isOpen={isOpen}
      showHeader
      handleClose={handleClose}
      contentScrollable
      className="max-w-4xl"
      buttons={[
        ...(canShareResult
          ? [
              {
                label: "Compartilhar",
                name: "share-stats",
                variant: { variant: "outline" as const },
                action: () => {
                  void handleShare();
                },
              },
            ]
          : []),
        ...(canChallengeFriend
          ? [
              {
                label: "Desafiar amigo",
                name: "share-challenge",
                variant: { variant: "outline" as const },
                action: () => {
                  void handleChallengeFriend();
                },
              },
            ]
          : []),
        ...(onOpenAchievements
          ? [
              {
                label: "Conquistas",
                name: "open-achievements",
                variant: { variant: "outline" as const },
                action: onOpenAchievements,
              },
            ]
          : []),
        ...(isPracticeMode &&
        (isGameOver || isGameWon) &&
        onRequestNewPracticeRound
          ? [
              {
                label: "Nova palavra",
                name: "new-practice-round",
                variant: { variant: "default" as const },
                action: () => {
                  void onRequestNewPracticeRound();
                },
              },
            ]
          : []),
      ]}
    >
      <div className="space-y-4 pb-3">
        <motion.div
          {...createFadeUpMotion({
            distance: 10,
            reducedMotion: shouldReduceMotion,
          })}
        >
          <StatsHeader gameStats={gameStats} />
        </motion.div>

        <motion.section
          className="surface-panel grid grid-cols-1 gap-3 p-4 md:grid-cols-3"
          {...createFadeUpMotion({
            distance: 10,
            delay: staggerDelay(1, 0.04, 0.18),
            reducedMotion: shouldReduceMotion,
          })}
        >
          <article className="surface-panel-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              precisão total
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {insights.successRate}%
            </p>
          </article>

          <article className="surface-panel-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              precisão sem erro
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {insights.perfectRate}%
            </p>
          </article>

          <article className="surface-panel-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              recorde perfeito
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {gameStats.bestPerfectStreak}
            </p>
          </article>
        </motion.section>

        <motion.section
          className="surface-panel grid grid-cols-1 gap-3 p-4 md:grid-cols-3"
          {...createFadeUpMotion({
            distance: 10,
            delay: staggerDelay(2, 0.04, 0.18),
            reducedMotion: shouldReduceMotion,
          })}
        >
          <article className="surface-panel-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              sessão atual
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {attemptsUsed}
            </p>
            <p className="text-xs text-muted-foreground">tentativas usadas</p>
          </article>

          <article className="surface-panel-card p-3">
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

          <article className="surface-panel-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              tentativas restantes
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {attemptsLeft}
            </p>
            <p className="text-xs text-muted-foreground">antes de encerrar</p>
          </article>
        </motion.section>

        <motion.section
          className="surface-panel grid grid-cols-1 gap-3 p-4 md:grid-cols-3"
          {...createFadeUpMotion({
            distance: 10,
            delay: staggerDelay(2.5, 0.04, 0.18),
            reducedMotion: shouldReduceMotion,
          })}
        >
          <article className="surface-panel-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              média para vencer
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {insights.averageAttemptsLabel}
            </p>
            <p className="text-xs text-muted-foreground">
              tentativas por vitória
            </p>
          </article>

          <article className="surface-panel-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              taxa de derrota
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {insights.failureRate}%
            </p>
            <p className="text-xs text-muted-foreground">rodadas sem acerto</p>
          </article>

          <article className="surface-panel-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              total de tentativas vencedoras
            </h4>
            <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-foreground">
              {insights.totalAttemptsInWins}
            </p>
            <p className="text-xs text-muted-foreground">
              somadas nas vitórias
            </p>
          </article>
        </motion.section>

        <motion.section
          className="surface-panel p-4"
          {...createFadeUpMotion({
            distance: 10,
            delay: staggerDelay(3, 0.04, 0.18),
            reducedMotion: shouldReduceMotion,
          })}
        >
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
        </motion.section>

        {canShowDailyLeaderboard ? (
          <motion.section
            className="surface-panel p-4"
            {...createFadeUpMotion({
              distance: 10,
              delay: staggerDelay(3.5, 0.04, 0.18),
              reducedMotion: shouldReduceMotion,
            })}
          >
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
              <Trophy className="size-4" />
              Ranking diário
            </h3>

            {isLoadingLeaderboard ? (
              <p className="text-sm text-muted-foreground">
                Carregando ranking...
              </p>
            ) : leaderboard.length ? (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => {
                  const isCurrentUser = entry.userId === user?.id;

                  return (
                    <article
                      key={`${entry.userId}-${entry.updatedAt}`}
                      className={
                        isCurrentUser
                          ? "surface-panel-card flex items-center justify-between gap-3 border-cyan-400/30 bg-cyan-500/8 p-3"
                          : "surface-panel-card flex items-center justify-between gap-3 p-3"
                      }
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/60 bg-background/70 font-mono text-xs font-semibold text-foreground">
                          {index + 1}º
                        </div>

                        <Avatar className="size-9 border border-border/60">
                          <AvatarImage
                            src={entry.avatarUrl ?? undefined}
                            alt={entry.displayName}
                          />
                          <AvatarFallback>
                            {entry.displayName.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {entry.displayName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {entry.attemptsUsed} tentativas
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
                          {entry.solvedBoards}/{entry.totalBoards}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          tabuleiros
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ainda não há vitórias registradas para esta rodada.
              </p>
            )}
          </motion.section>
        ) : null}

        {(isGameOver || isGameWon) && isLatestGame && !isPracticeMode && (
          <motion.section
            className="flex flex-col items-center justify-center pt-1 text-center"
            {...createFadeUpMotion({
              distance: 10,
              delay: staggerDelay(3.75, 0.04, 0.18),
              reducedMotion: shouldReduceMotion,
            })}
          >
            <h3 className="mb-2 flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-foreground">
              <Clock3 className="size-4" />
              {statsCopy.nextWordIn}
            </h3>
            <Countdown
              date={solutions.tomorrow}
              daysInHours={true}
              className="font-mono text-5xl font-semibold leading-none tracking-tight text-foreground tabular-nums md:text-6xl"
            />
          </motion.section>
        )}
      </div>
    </Base>
  );
}
