"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { gameSettings } from "@/config/game";
import { createScaleInMotion, staggerDelay } from "@/config/motion-variants";
import { useGame } from "@/contexts/GameContext";
import { cn } from "@/lib/utils";
import { Grid } from "../Grid";

type Props = {
  isRevealing?: boolean;
  isEndGame?: boolean;
  isGameOver?: boolean;
  isGameWon?: boolean;
  currentRowClass: string;
  rowAnimation: string | null;
};

export function Boards({
  isRevealing,
  isEndGame = false,
  isGameOver = false,
  isGameWon = false,
  currentRowClass,
  rowAnimation,
}: Props) {
  const {
    gameMode,
    guesses,
    solutions: { solution },
  } = useGame();
  const boardsCount = solution.length || gameSettings[gameMode]?.boards || 1;
  const boardWordLength =
    solution[0]?.length || gameSettings[gameMode]?.wordLength || 5;
  const shouldReduceMotion = useReducedMotion() ?? false;
  const [activeMobileBoard, setActiveMobileBoard] = useState(0);
  const solvedBoards = useMemo(
    () => solution.map((word) => guesses.some((guess) => guess.word === word)),
    [guesses, solution],
  );
  const isQuintetoMobile = boardsCount === 5;

  useEffect(() => {
    if (!isQuintetoMobile) {
      setActiveMobileBoard(0);
      return;
    }

    const nextUnsolvedIndex = solvedBoards.findIndex((isSolved) => !isSolved);

    if (nextUnsolvedIndex === -1) {
      setActiveMobileBoard((currentIndex) =>
        Math.min(currentIndex, boardsCount - 1),
      );
      return;
    }

    setActiveMobileBoard((currentIndex) =>
      solvedBoards[currentIndex] ? nextUnsolvedIndex : currentIndex,
    );
  }, [boardsCount, isQuintetoMobile, solvedBoards]);

  const renderBoard = (index: number, className?: string) => (
    <motion.div
      key={`board_${index}`}
      className={cn("w-fit max-w-full", className)}
      {...createScaleInMotion({
        reducedMotion: shouldReduceMotion,
        delay: staggerDelay(index, 0.06, 0.22),
      })}
    >
      <Grid
        index={index}
        isRevealing={isRevealing}
        isEndGame={
          isEndGame ||
          guesses.findIndex((s) => s.word === solution[index]) !== -1
        }
        isGameOver={isGameOver}
        isWon={guesses.some((guess) => guess.word === solution[index])}
        currentRowClass={currentRowClass}
        rowAnimation={rowAnimation}
      />
    </motion.div>
  );

  if (isQuintetoMobile) {
    return (
      <>
        <div className="quinteto-mobile-nav mb-2 flex w-full max-w-[min(100vw-0.75rem,26rem)] items-center gap-1 md:hidden">
          {solution.map((_, index) => {
            const isSolved = solvedBoards[index];
            const isActive = index === activeMobileBoard;

            return (
              <Button
                key={`mobile-board-tab_${index}`}
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveMobileBoard(index)}
                className={cn(
                  "h-10 flex-1 rounded-xl px-0 text-sm font-semibold",
                  isActive &&
                    "border-primary bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.28)]",
                  !isActive &&
                    "border-border/65 bg-background/70 text-foreground/88",
                  isSolved &&
                    !isActive &&
                    "border-emerald-500/50 bg-emerald-500/12 text-emerald-300",
                )}
              >
                {isSolved ? `OK ${index + 1}` : `Tab ${index + 1}`}
              </Button>
            );
          })}
        </div>

        <div
          data-mode={boardsCount}
          data-word-length={boardWordLength}
          className="boards hidden w-full flex-1 content-start items-start justify-items-center gap-3 md:grid md:grid-cols-3 md:gap-5 xl:grid-cols-5"
        >
          {Array.from({ length: boardsCount }).map((_, index) =>
            renderBoard(index),
          )}
        </div>

        <div
          data-mode={boardsCount}
          data-word-length={boardWordLength}
          className="boards flex w-full flex-1 items-start justify-center md:hidden"
        >
          {renderBoard(activeMobileBoard, "quinteto-mobile-active")}
        </div>
      </>
    );
  }

  return (
    <div
      data-mode={boardsCount}
      data-word-length={boardWordLength}
      className={cn(
        "boards grid w-full flex-1 content-start items-start justify-items-center gap-3 md:gap-5",
        boardsCount === 1 && "grid-cols-1",
        boardsCount === 2 && "grid-cols-2 lg:grid-cols-2",
        boardsCount === 3 && "grid-cols-2 xl:grid-cols-3",
        boardsCount === 4 && "grid-cols-2 lg:grid-cols-4",
        boardsCount === 5 && "grid-cols-2 md:grid-cols-3 xl:grid-cols-5",
      )}
    >
      {Array.from({ length: boardsCount }).map((_, index) =>
        renderBoard(index),
      )}
    </div>
  );
}
