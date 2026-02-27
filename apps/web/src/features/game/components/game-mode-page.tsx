"use client";

import { motion } from "motion/react";
import { Boards } from "@/features/game/components/Board";
import { Keyboard } from "@/features/game/components/Keyboard";
import { SessionStatus } from "@/features/game/components/session-status";
import { StatsModal } from "@/features/stats/components/stats-modal";
import { Loading } from "@/components/ui/loading";
import { Toaster } from "@/components/ui/sonner";
import { useGameSession } from "@/features/game/hooks/use-game-session";
import { GameMode } from "@/interfaces/game";
import { cn } from "@/lib/utils";

type Props = {
  mode: GameMode;
};

export const GameModePage = ({ mode }: Props) => {
  const {
    modeMaxChallenges,
    isLatestGame,
    currentRowClass,
    rowAnimation,
    isRevealing,
    isGameOver,
    isGameWon,
    gameEnded,
    isInfoModalOpen,
    isStatsModalOpen,
    isSettingsModalOpen,
    isLoading,
    isHydrated,
    solutions,
    stats,
    guesses,
    onEnter,
    onDelete,
    onTyping,
    setIsStatsModalOpen,
  } = useGameSession(mode);

  const attemptsUsed = guesses.length;
  const attemptsLeft = Math.max(modeMaxChallenges - attemptsUsed, 0);
  const isInfiniteMode = mode === GameMode.infinite;
  const solvedBoards = solutions.solution.reduce((count, word) => {
    return guesses.some((guess) => guess.word === word) ? count + 1 : count;
  }, 0);

  if (isLoading || !isHydrated) {
    return <Loading />;
  }

  return (
    <>
      <div
        className={cn(
          "mx-auto flex h-full min-h-0 w-full max-w-[1700px] flex-1 flex-col items-center gap-2 px-1 py-1 md:px-2",
          isInfoModalOpen || isStatsModalOpen || isSettingsModalOpen
            ? "blur-sm"
            : "",
        )}
      >
        <motion.div
          className="flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-2 md:p-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22 }}
        >
          {isInfiniteMode ? (
            <div className="flex w-full flex-col gap-3 xl:grid xl:grid-cols-[20rem_minmax(0,1fr)_20rem] xl:items-start">
              <div className="hidden xl:block" aria-hidden />

              <div className="w-full xl:col-start-2 xl:flex xl:justify-center">
                <Boards
                  currentRowClass={currentRowClass}
                  rowAnimation={rowAnimation}
                  isRevealing={isRevealing}
                  isEndGame={gameEnded}
                  isGameOver={isGameOver}
                  isGameWon={isGameWon}
                />
              </div>

              <div className="w-full xl:col-start-3 xl:flex xl:justify-end">
                <SessionStatus
                  attemptsLeft={attemptsLeft}
                  solvedBoards={solvedBoards}
                  totalBoards={solutions.solution.length}
                  currentStreak={stats.curstreak}
                  layout="sidebar"
                />
              </div>
            </div>
          ) : (
            <div className="flex w-full flex-col items-center justify-center">
              <Boards
                currentRowClass={currentRowClass}
                rowAnimation={rowAnimation}
                isRevealing={isRevealing}
                isEndGame={gameEnded}
                isGameOver={isGameOver}
                isGameWon={isGameWon}
              />
            </div>
          )}

          <Keyboard
            guesses={guesses}
            isRevealing={isRevealing}
            onEnter={onEnter}
            onDelete={onDelete}
            onTyping={(key) =>
              onTyping(key, solutions.solution[0], modeMaxChallenges, gameEnded)
            }
            solutions={solutions.solution}
            disabled={
              gameEnded ||
              !solutions.solution.length ||
              isInfoModalOpen ||
              isStatsModalOpen ||
              isSettingsModalOpen
            }
          />
        </motion.div>
      </div>

      {isStatsModalOpen && (
        <StatsModal
          isOpen={isStatsModalOpen}
          solution={solutions.solution[0]}
          gameStats={stats}
          isLatestGame={isLatestGame}
          isGameOver={isGameOver}
          isGameWon={isGameWon}
          handleClose={() => setIsStatsModalOpen(false)}
        />
      )}

      <Toaster richColors />
    </>
  );
};
