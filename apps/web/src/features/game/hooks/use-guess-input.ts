"use client";

import { type Dispatch, type SetStateAction, useCallback } from "react";
import {
  computeDeleteUpdate,
  computeTypingUpdate,
} from "@/features/game/session/input";
import type { Guess, Solution } from "@/interfaces/game";

type UseGuessInputParams = {
  guessesLength: number;
  currentGuess: Guess;
  setCurrentGuess: Dispatch<SetStateAction<Guess>>;
  currentRow: number;
  selectedTileIndex: number;
  setSelectedTileIndex: Dispatch<SetStateAction<number>>;
  solutions: Solution;
};

export const useGuessInput = ({
  guessesLength,
  currentGuess,
  setCurrentGuess,
  currentRow,
  selectedTileIndex,
  setSelectedTileIndex,
  solutions,
}: UseGuessInputParams) => {
  const onTyping = useCallback(
    (
      value: string,
      currentSolution: string,
      maxChallenges: number,
      isGameLocked: boolean,
    ) => {
      const result = computeTypingUpdate({
        value,
        currentSolution,
        maxChallenges,
        isGameLocked,
        guessesLength,
        currentGuess,
        currentRow,
        selectedTileIndex,
      });

      if (!result.shouldUpdate) {
        return;
      }

      setCurrentGuess(result.nextGuess);
      setSelectedTileIndex(result.nextTileIndex);
    },
    [
      currentGuess,
      currentRow,
      guessesLength,
      selectedTileIndex,
      setCurrentGuess,
      setSelectedTileIndex,
    ],
  );

  const onDelete = useCallback(() => {
    const result = computeDeleteUpdate({
      currentGuess,
      selectedTileIndex,
      maxLength: solutions.solution[0]?.length ?? 5,
    });

    if (!result.shouldUpdate) {
      return;
    }

    setCurrentGuess(result.nextGuess);
    setSelectedTileIndex(result.nextTileIndex);
  }, [
    currentGuess,
    selectedTileIndex,
    setCurrentGuess,
    setSelectedTileIndex,
    solutions.solution,
  ]);

  return {
    onTyping,
    onDelete,
  };
};
