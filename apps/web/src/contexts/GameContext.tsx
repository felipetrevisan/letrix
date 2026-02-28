"use client";

import {
  createContext,
  type Dispatch,
  type SetStateAction,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { gameSettings, initialGuess, initialStats } from "@/config/game";
import { useGameStateManager } from "@/features/game/hooks/use-game-state-manager";
import { useGuessInput } from "@/features/game/hooks/use-guess-input";
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
import { getGameDate, getIndex, getNextGameDate } from "@/lib/words";

const buildEmptySolution = (language: GameLanguage = "pt"): Solution => {
  const gameDate = getGameDate();

  return {
    solution: [],
    displaySolution: [],
    definitions: [],
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

  const {
    clearGuesses,
    resetCurrentGuess,
    changeGameMode,
    updateGameFromSave,
    saveGuess,
  } = useGameStateManager({
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
  });

  const { onTyping, onDelete } = useGuessInput({
    guessesLength: guesses.length,
    currentGuess,
    setCurrentGuess,
    currentRow,
    selectedTileIndex,
    setSelectedTileIndex,
    solutions,
  });

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
