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
  const [activeMobilePage, setActiveMobilePage] = useState(0);
  const solvedBoards = useMemo(
    () => solution.map((word) => guesses.some((guess) => guess.word === word)),
    [guesses, solution],
  );
  const isPagedMobileMode = boardsCount >= 5;
  const mobileBoardPages = useMemo(() => {
    if (!isPagedMobileMode) {
      return [];
    }

    const pages: number[][] = [];

    for (let index = 0; index < boardsCount; index += 2) {
      pages.push(
        [index, index + 1].filter((boardIndex) => boardIndex < boardsCount),
      );
    }

    return pages;
  }, [boardsCount, isPagedMobileMode]);

  useEffect(() => {
    if (!isPagedMobileMode) {
      setActiveMobilePage(0);
      return;
    }

    const nextUnsolvedIndex = solvedBoards.findIndex((isSolved) => !isSolved);

    if (nextUnsolvedIndex === -1) {
      setActiveMobilePage((currentPage) =>
        Math.min(currentPage, mobileBoardPages.length - 1),
      );
      return;
    }

    const nextPageIndex = mobileBoardPages.findIndex((page) =>
      page.includes(nextUnsolvedIndex),
    );

    setActiveMobilePage((currentPage) => {
      const currentBoards = mobileBoardPages[currentPage] ?? [];
      const hasOpenBoardInCurrentPage = currentBoards.some(
        (boardIndex) => !solvedBoards[boardIndex],
      );

      if (hasOpenBoardInCurrentPage) {
        return currentPage;
      }

      return nextPageIndex === -1 ? currentPage : nextPageIndex;
    });
  }, [boardsCount, isPagedMobileMode, mobileBoardPages, solvedBoards]);

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

  if (isPagedMobileMode) {
    const activePageBoards = mobileBoardPages[activeMobilePage] ?? [];

    return (
      <>
        <div className="quinteto-mobile-nav mb-2 flex w-full max-w-[min(100vw-0.75rem,26rem)] items-center gap-1 md:hidden">
          {mobileBoardPages.map((page, pageIndex) => {
            const isSolved = page.every(
              (boardIndex) => solvedBoards[boardIndex],
            );
            const isActive = pageIndex === activeMobilePage;
            const label =
              page.length === 1
                ? `Board ${page[0] + 1}`
                : `${page[0] + 1} e ${page[1] + 1}`;

            return (
              <Button
                key={`mobile-board-tab_${page.join("-")}`}
                type="button"
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveMobilePage(pageIndex)}
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
                {isSolved ? `OK ${label}` : label}
              </Button>
            );
          })}
        </div>

        <div
          data-mode={boardsCount}
          data-word-length={boardWordLength}
          className={cn(
            "boards hidden w-full flex-1 content-start items-start justify-items-center gap-3 md:grid md:gap-5",
            boardsCount === 5 && "md:grid-cols-3 xl:grid-cols-5",
            boardsCount === 6 && "md:grid-cols-3 2xl:grid-cols-6",
          )}
        >
          {Array.from({ length: boardsCount }).map((_, index) =>
            renderBoard(index),
          )}
        </div>

        <div
          data-mode={Math.min(activePageBoards.length, 2)}
          data-word-length={boardWordLength}
          className="boards grid w-full flex-1 grid-cols-2 items-start justify-items-center gap-3 md:hidden"
        >
          {activePageBoards.map((boardIndex) => renderBoard(boardIndex))}
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
        boardsCount === 6 && "grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6",
      )}
    >
      {Array.from({ length: boardsCount }).map((_, index) =>
        renderBoard(index),
      )}
    </div>
  );
}
