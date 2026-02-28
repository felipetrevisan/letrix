"use client";

import { type Dispatch, type SetStateAction, useCallback } from "react";
import { initialGuess, initialStats } from "@/config/game";
import { GameMode, type GameStats, type Guess } from "@/interfaces/game";

type UseGameStateManagerParams = {
  setGameMode: Dispatch<SetStateAction<GameMode>>;
  setStats: Dispatch<SetStateAction<GameStats>>;
  setCurrentRow: Dispatch<SetStateAction<number>>;
  setCurrentGuess: Dispatch<SetStateAction<Guess>>;
  setGuesses: Dispatch<SetStateAction<Guess[]>>;
  setInvalidGuesses: Dispatch<SetStateAction<string[]>>;
  setSelectedTileIndex: Dispatch<SetStateAction<number>>;
  setSelectedRowIndex: Dispatch<SetStateAction<number>>;
  currentGuess: Guess;
  currentRow: number;
};

export const useGameStateManager = ({
  setGameMode,
  setStats,
  setCurrentRow,
  setCurrentGuess,
  setGuesses,
  setInvalidGuesses,
  setSelectedTileIndex,
  setSelectedRowIndex,
  currentGuess,
  currentRow,
}: UseGameStateManagerParams) => {
  const clearGuesses = useCallback(() => {
    setGuesses([]);
  }, [setGuesses]);

  const resetCurrentGuess = useCallback(() => {
    setCurrentGuess(initialGuess);
  }, [setCurrentGuess]);

  const changeGameMode = useCallback(
    (mode: GameMode) => {
      setGameMode(mode);
      setStats(initialStats);
      setCurrentRow(0);
      setCurrentGuess(initialGuess);
      setGuesses([]);
      setInvalidGuesses([]);
      setSelectedTileIndex(0);
      setSelectedRowIndex(0);
    },
    [
      setCurrentGuess,
      setCurrentRow,
      setGameMode,
      setGuesses,
      setInvalidGuesses,
      setSelectedRowIndex,
      setSelectedTileIndex,
      setStats,
    ],
  );

  const updateGameFromSave = useCallback(
    (savedGuesses: string[]) => {
      const hydratedGuesses: Guess[] = savedGuesses.map((word, row) => ({
        row,
        word,
        letters: word.split(""),
        status: "complete",
        guessedRow: null,
      }));

      setGuesses(hydratedGuesses);
      setCurrentRow(savedGuesses.length);
      setCurrentGuess(initialGuess);
      setSelectedTileIndex(0);
    },
    [setCurrentGuess, setCurrentRow, setGuesses, setSelectedTileIndex],
  );

  const saveGuess = useCallback(() => {
    setGuesses((prev) => [
      ...prev,
      {
        ...currentGuess,
        row: currentRow,
        status: "complete",
      },
    ]);
  }, [currentGuess, currentRow, setGuesses]);

  return {
    clearGuesses,
    resetCurrentGuess,
    changeGameMode,
    updateGameFromSave,
    saveGuess,
  };
};
