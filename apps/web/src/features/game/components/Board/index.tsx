"use client";

import { motion, useReducedMotion } from "motion/react";
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

  return (
    <div
      data-mode={boardsCount}
      data-word-length={boardWordLength}
      className={cn(
        "boards grid w-full flex-1 content-start items-start justify-items-center gap-3 md:gap-5",
        boardsCount === 1 && "grid-cols-1",
        boardsCount === 2 && "grid-cols-1 lg:grid-cols-2",
        boardsCount === 3 && "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3",
        boardsCount === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        boardsCount === 5 && "grid-cols-1 sm:grid-cols-2 xl:grid-cols-5",
      )}
    >
      {Array.from({ length: boardsCount }).map((_, index) => (
        <motion.div
          key={`board_${index}`}
          className="w-fit max-w-full"
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
      ))}
    </div>
  );
}
