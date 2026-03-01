"use client";

import { cva } from "class-variance-authority";
import { REVEAL_TIME_MS } from "@/config/settings";
import { cn } from "@/lib/utils";
import { getGuessStatuses } from "@/lib/statuses";
import { unicodeSplit } from "@/lib/words";
import { useGame } from "@/contexts/GameContext";
import {
  getBoardRowState,
  resolveDisplayedRowLetters,
} from "@/features/game/session/board-state";
import { Tile } from "../Tiles";
import { SolvedRowDefinitionTooltip } from "./solved-row-definition-tooltip";

type Props = {
  index: number;
  board: number;
  className?: string;
  animation?: string | null;
};

export function Row({ index, board, className = "", animation }: Props) {
  const {
    currentRow,
    currentGuess,
    solutions,
    guesses,
    selectedTileIndex,
    setSelectedTileIndex,
  } = useGame();

  const classes = cva(["row", className], {
    variants: {
      active: {
        true: "row-active",
      },
    },
    defaultVariants: {
      active: false,
    },
  });

  const boardSolution = solutions.solution[board] ?? "";
  const guessesWords = guesses.map((guess) => guess.word);
  const boardRowState = getBoardRowState({
    rowIndex: index,
    currentRow,
    boardSolution,
    guessWordAtRow: guesses[index]?.word,
    guessesWords,
  });
  const isCurrentRow = boardRowState.isCurrentRow;
  const isBoardSolved = boardRowState.isBoardSolved;
  const effectiveGuessedIndex = boardRowState.guessedIndex;
  const isInteractiveCurrentRow = boardRowState.isInteractiveCurrentRow;
  const isAnimatingCurrentRow = isInteractiveCurrentRow;
  const rowStatus = boardRowState.rowStatus;
  const canSelectTile = (tileIndex: number) => {
    if (isInteractiveCurrentRow) {
      setSelectedTileIndex(tileIndex);
    }
  };

  const boardWordLength = boardSolution.length || 5;
  const tileSize = boardWordLength >= 10 ? "small" : "large";
  const displayedRowLetters = resolveDisplayedRowLetters({
    isBoardSolved,
    rowIndex: index,
    guessedIndex: effectiveGuessedIndex,
    isCurrentRow,
    currentGuessLetters: currentGuess.letters,
    savedGuessLetters: guesses[index]?.letters ?? [],
  });
  const isRevealingCurrentRow =
    isAnimatingCurrentRow && animation === "revealing";
  const statuses = getGuessStatuses(
    isRevealingCurrentRow ? currentGuess.letters : displayedRowLetters,
    boardSolution,
  );
  const shouldShowStatuses =
    isRevealingCurrentRow ||
    (!isInteractiveCurrentRow && displayedRowLetters.length > 0);
  const displayedRowWord = displayedRowLetters.join("");
  const shouldShowAccentedWord =
    shouldShowStatuses && displayedRowWord === boardSolution;
  const boardDisplayWord = solutions.displaySolution[board] ?? boardSolution;
  const boardDefinition = solutions.definitions[board] ?? null;
  const boardLanguage = solutions.language;
  const shouldShowDefinitionTooltip =
    shouldShowAccentedWord && Boolean(boardDefinition?.trim());
  const renderLetters = shouldShowAccentedWord
    ? unicodeSplit(boardDisplayWord)
    : displayedRowLetters;

  return (
    <div
      className={cn(classes({ active: isInteractiveCurrentRow }))}
      data-row={index}
      data-board={board}
      data-active={isInteractiveCurrentRow}
      data-animation={isAnimatingCurrentRow ? animation : ""}
      data-status={rowStatus}
    >
      {Array.from({ length: boardWordLength }).map((_, tileIndex) => {
        const rowWord = renderLetters.join("");
        const isCompleted = rowWord.length === boardWordLength;

        const getValue = () => {
          return renderLetters[tileIndex] ?? "";
        };

        return (
          <Tile
            key={`tile_${board}_${index}_${tileIndex}`}
            position={tileIndex}
            size={tileSize}
            isCompleted={isCompleted}
            isSelected={
              selectedTileIndex === tileIndex && isInteractiveCurrentRow
            }
            value={getValue()}
            isActive={isInteractiveCurrentRow}
            status={shouldShowStatuses ? statuses[tileIndex] : undefined}
            isEndGame={isBoardSolved}
            revealDelayMs={
              isRevealingCurrentRow
                ? REVEAL_TIME_MS * (tileIndex + 1)
                : undefined
            }
            onSelect={() => canSelectTile(tileIndex)}
          />
        );
      })}
      {shouldShowDefinitionTooltip ? (
        <SolvedRowDefinitionTooltip
          language={boardLanguage}
          normalizedWord={boardSolution}
          word={boardDisplayWord}
          definition={boardDefinition}
        />
      ) : null}
    </div>
  );
}
