"use client";

import { motion } from "motion/react";
import { gameSettings } from "@/config/game";
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

  return (
    <div
      data-mode={boardsCount}
      className={cn(
        "boards grid w-full flex-1 content-start items-start justify-items-center gap-3 md:gap-5",
        boardsCount === 1 && "grid-cols-1",
        boardsCount === 2 && "grid-cols-1 lg:grid-cols-2",
        boardsCount === 3 && "grid-cols-1 lg:grid-cols-2 xl:grid-cols-3",
        boardsCount === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {Array.from({ length: boardsCount }).map((_, index) => (
        <motion.div
          key={`board_${index}`}
          className="w-fit max-w-full"
          initial={{ opacity: 0, y: 14, scale: 0.94, filter: "blur(2px)" }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
          transition={{
            duration: 0.24,
            delay: Math.min(index * 0.06, 0.22),
            ease: "easeOut",
          }}
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
