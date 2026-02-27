"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { gameSettings, initialGuess, initialStats } from "@/config/game";
import { type ContextProps, type GameContextValue } from "@/interfaces/context";
import {
  type GameLanguage,
  GameMode,
  type GameStats,
  type Guess,
  GuessStatus,
  type Solution,
} from "@/interfaces/game";
import { loadStats } from "@/lib/stats";
import {
  getGameDate,
  getIndex,
  getNextGameDate,
  localeAwareLowerCase,
} from "@/lib/words";

const buildEmptySolution = (language: GameLanguage = "pt"): Solution => {
  const gameDate = getGameDate();

  return {
    solution: [],
    displaySolution: [],
    solutionDate: gameDate,
    solutionIndex: getIndex(gameDate),
    tomorrow: getNextGameDate(gameDate).valueOf(),
    language,
  };
};

const defaultContextValue: GameContextValue = {
  gameMode: GameMode.term,
  solutions: {} as Solution,
  currentRow: 0,
  currentGuess: initialGuess,
  guesses: [],
  invalidGuesses: [],
  stats: initialStats,
  selectedTileIndex: 0,
  selectedRowIndex: 0,
  changeGameMode: () => {},
  clearGuesses: () => {},
  setCurrentGuess: (() => {}) as Dispatch<SetStateAction<Guess>>,
  setGuesses: (() => {}) as Dispatch<SetStateAction<Guess[]>>,
  setSolutions: (() => {}) as Dispatch<SetStateAction<Solution>>,
  setInvalidGuesses: (() => {}) as Dispatch<SetStateAction<string[]>>,
  setStats: (() => {}) as Dispatch<SetStateAction<GameStats>>,
  setSelectedTileIndex: (() => {}) as Dispatch<SetStateAction<number>>,
  setSelectedRowIndex: (() => {}) as Dispatch<SetStateAction<number>>,
  setCurrentRow: (() => {}) as Dispatch<SetStateAction<number>>,
  updateGameFromSave: () => {},
  updateGuessStatus: () => {},
  resetCurrentGuess: () => {},
  saveGuess: () => {},
  onTyping: () => {},
  onDelete: () => {},
  getMaxChallenges: () => 0,
  getName: () => "",
  isTerm: () => false,
  isDuo: () => false,
  isTrio: () => false,
  isFour: () => false,
  isInfinite: () => false,
};

export const GameContext = createContext<GameContextValue>(defaultContextValue);

GameContext.displayName = "GameContextValue";

export const useGame = () => useContext(GameContext);

export const GameProvider: React.FC<ContextProps> = ({ children }) => {
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.term);
  const [currentGuess, setCurrentGuess] = useState<Guess>(initialGuess);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [invalidGuesses, setInvalidGuesses] = useState<string[]>([]);
  const [currentRow, setCurrentRow] = useState(0);
  const [selectedTileIndex, setSelectedTileIndex] = useState(0);
  const [selectedRowIndex, setSelectedRowIndex] = useState(0);
  const [stats, setStats] = useState<GameStats>(() => loadStats(GameMode.term));
  const [solutions, setSolutions] = useState<Solution>(() =>
    buildEmptySolution(),
  );

  const getMaxChallenges = useCallback(() => {
    return gameSettings[gameMode].maxChallenges ?? 6;
  }, [gameMode]);

  const getName = useCallback(() => {
    return gameSettings[gameMode].name ?? "";
  }, [gameMode]);

  const clearGuesses = useCallback(() => {
    setGuesses([]);
  }, []);

  const resetCurrentGuess = useCallback(() => {
    setCurrentGuess(initialGuess);
  }, []);

  const changeGameMode = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setStats(initialStats);
    setCurrentRow(0);
    setCurrentGuess(initialGuess);
    setGuesses([]);
    setInvalidGuesses([]);
    setSelectedTileIndex(0);
    setSelectedRowIndex(0);
  }, []);

  const updateGameFromSave = useCallback((savedGuesses: string[]) => {
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
  }, []);

  const updateGuessStatus = useCallback(
    (rowIndex: number, status: keyof typeof GuessStatus) => {
      setGuesses((prev) =>
        prev.map((guess, index) =>
          index === rowIndex ? { ...guess, status } : guess,
        ),
      );
    },
    [],
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
  }, [currentGuess, currentRow]);

  const onTyping = useCallback(
    (
      value: string,
      currentSolution: string,
      maxChallenges: number,
      isGameLocked: boolean,
    ) => {
      const nextLetter = localeAwareLowerCase(value);

      if (guesses.length >= maxChallenges || isGameLocked) {
        return;
      }

      const maxLength = currentSolution.length;
      if (!maxLength) {
        return;
      }

      const targetIndex = Math.min(
        Math.max(selectedTileIndex, 0),
        maxLength - 1,
      );
      const letters = Array.from(
        { length: maxLength },
        (_, index) => currentGuess.letters[index] ?? "",
      );

      letters[targetIndex] = nextLetter;

      const nextEmptyAfterCurrent = letters.findIndex(
        (letter, index) => index > targetIndex && !letter,
      );
      const nextTileIndex =
        nextEmptyAfterCurrent !== -1 ? nextEmptyAfterCurrent : targetIndex;

      setCurrentGuess({
        ...currentGuess,
        row: currentRow,
        letters,
        word: letters.join(""),
      });
      setSelectedTileIndex(nextTileIndex);
    },
    [guesses.length, currentGuess, currentRow, selectedTileIndex],
  );

  const onDelete = useCallback(() => {
    const maxLength = solutions.solution[0]?.length ?? 5;
    if (!maxLength) {
      return;
    }

    const startIndex = Math.min(Math.max(selectedTileIndex, 0), maxLength - 1);
    const letters = Array.from(
      { length: maxLength },
      (_, index) => currentGuess.letters[index] ?? "",
    );

    if (!letters.some((letter) => !!letter)) {
      setSelectedTileIndex(0);
      return;
    }

    let targetIndex = startIndex;
    if (!letters[targetIndex]) {
      while (targetIndex > 0 && !letters[targetIndex]) {
        targetIndex -= 1;
      }
    }

    if (!letters[targetIndex]) {
      const lastFilledIndex = letters.findLastIndex((letter) => !!letter);
      if (lastFilledIndex < 0) {
        setSelectedTileIndex(0);
        return;
      }
      targetIndex = lastFilledIndex;
    }

    letters[targetIndex] = "";

    setCurrentGuess({
      ...currentGuess,
      letters,
      word: letters.join(""),
    });
    setSelectedTileIndex(targetIndex);
  }, [currentGuess, selectedTileIndex, solutions.solution]);

  const isTerm = useCallback(() => gameMode === GameMode.term, [gameMode]);
  const isDuo = useCallback(() => gameMode === GameMode.duo, [gameMode]);
  const isTrio = useCallback(() => gameMode === GameMode.trio, [gameMode]);
  const isFour = useCallback(() => gameMode === GameMode.four, [gameMode]);
  const isInfinite = useCallback(
    () => gameMode === GameMode.infinite,
    [gameMode],
  );

  const value = useMemo<GameContextValue>(
    () => ({
      gameMode,
      solutions,
      currentRow,
      currentGuess,
      guesses,
      invalidGuesses,
      stats,
      selectedTileIndex,
      selectedRowIndex,
      changeGameMode,
      clearGuesses,
      setCurrentGuess,
      setGuesses,
      setSolutions,
      setInvalidGuesses,
      setStats,
      setSelectedTileIndex,
      setSelectedRowIndex,
      setCurrentRow,
      onTyping,
      onDelete,
      saveGuess,
      updateGameFromSave,
      updateGuessStatus,
      resetCurrentGuess,
      getMaxChallenges,
      getName,
      isTerm,
      isDuo,
      isTrio,
      isFour,
      isInfinite,
    }),
    [
      gameMode,
      solutions,
      currentRow,
      currentGuess,
      guesses,
      invalidGuesses,
      stats,
      selectedTileIndex,
      selectedRowIndex,
      changeGameMode,
      clearGuesses,
      setSolutions,
      onTyping,
      onDelete,
      saveGuess,
      updateGameFromSave,
      updateGuessStatus,
      resetCurrentGuess,
      getMaxChallenges,
      getName,
      isTerm,
      isDuo,
      isTrio,
      isFour,
      isInfinite,
    ],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
