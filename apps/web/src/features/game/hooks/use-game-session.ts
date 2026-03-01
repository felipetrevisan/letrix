"use client";

import { formatISO } from "date-fns";
import { usePathname } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { gameSettings } from "@/config/game";
import { useApp } from "@/contexts/AppContext";
import { useGame } from "@/contexts/GameContext";
import type { RowAnimation } from "@/features/game/hooks/types";
import { useAutoOpenStats } from "@/features/game/hooks/use-auto-open-stats";
import { useGameSessionBootstrap } from "@/features/game/hooks/use-game-session-bootstrap";
import { useSubmitGuess } from "@/features/game/hooks/use-submit-guess";
import { useGamePersistence } from "@/hooks/session/use-game-persistence";
import { GameMode } from "@/interfaces/game";
import { gameNames } from "@/lib/copy";
import { isEndGame } from "@/lib/game";
import {
  getGameDate,
  getIsLatestGame,
  resolveLanguageFromLocale,
} from "@/lib/words";

export const useGameSession = (mode: GameMode) => {
  const pathname = usePathname();
  const locale = pathname.split("/").filter(Boolean)[0] ?? "pt";
  const language = resolveLanguageFromLocale(locale);

  const {
    storage,
    isInfoModalOpen,
    isStatsModalOpen,
    isSettingsModalOpen,
    isLoading,
    isAuthReady,
    user,
    openMenu,
    closeMenu,
    loading,
    setIsInfoModalOpen,
    setIsStatsModalOpen,
  } = useApp();

  const {
    currentRow,
    solutions,
    currentGuess,
    guesses,
    invalidGuesses,
    stats,
    changeGameMode,
    clearGuesses,
    setInvalidGuesses,
    setCurrentRow,
    setSelectedTileIndex,
    setStats,
    setSolutions,
    onTyping,
    onDelete,
    updateGameFromSave,
    saveGuess,
    resetCurrentGuess,
  } = useGame();

  const isLatestGame = getIsLatestGame();
  const modeConfig = gameSettings[mode];
  const isInfiniteMode = modeConfig.name === "infinite";
  const storageScope = `${modeConfig.name}-${language}`;
  const puzzleDate = formatISO(getGameDate(), { representation: "date" });
  const { loadSavedState, persistGameState, persistStats } = useGamePersistence(
    {
      userId: user?.id,
      language,
      modeName: modeConfig.name,
      puzzleDate,
      storageScope,
      isLatestGame,
    },
  );

  const [currentRowClass, setCurrentRowClass] = useState("");
  const [rowAnimation, setRowAnimation] = useState<RowAnimation | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isGameWon, setIsGameWon] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSubmittingGuess, setIsSubmittingGuess] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const gameEnded = useMemo(
    () => isEndGame(isGameWon, isGameOver),
    [isGameWon, isGameOver],
  );

  const clearCurrentRowClass = useCallback(() => {
    setCurrentRowClass("");
    setRowAnimation(null);
  }, []);

  const triggerInvalidRowAnimation = useCallback(() => {
    setRowAnimation(null);

    if (typeof window !== "undefined") {
      window.requestAnimationFrame(() => {
        setRowAnimation("invalid");
      });
      return;
    }

    setRowAnimation("invalid");
  }, []);

  const { resetAutoOpenStats } = useAutoOpenStats({
    gameEnded,
    isLoading,
    setIsStatsModalOpen,
    solutions,
  });

  useGameSessionBootstrap({
    isAuthReady,
    closeMenu,
    resetAutoOpenStats,
    changeGameMode,
    mode,
    language,
    loading,
    setIsGameOver,
    setIsGameWon,
    setIsHydrated,
    setIsSubmittingGuess,
    setSessionError,
    modeConfig,
    storageScope,
    userId: user?.id,
    setStats,
    loadSavedState,
    isInfiniteMode,
    setSolutions,
    updateGameFromSave,
    persistGameState,
    setIsInfoModalOpen,
  });

  const { onEnter } = useSubmitGuess({
    gameEnded,
    solutions,
    isSubmittingGuess,
    setIsSubmittingGuess,
    currentGuess,
    modeConfig,
    language,
    triggerInvalidRowAnimation,
    clearCurrentRowClass,
    setInvalidGuesses,
    storage,
    guesses,
    currentRow,
    isGameWon,
    setIsRevealing,
    setRowAnimation,
    setSelectedTileIndex,
    saveGuess,
    invalidGuesses,
    isInfiniteMode,
    persistGameState,
    resetCurrentGuess,
    clearGuesses,
    setCurrentRow,
    setSolutions,
    setStats,
    stats,
    persistStats,
    setIsGameWon,
    setIsGameOver,
    setIsStatsModalOpen,
    mode,
  });

  return {
    gameTitle:
      gameNames[modeConfig.name as keyof typeof gameNames] ?? modeConfig.name,
    gameName: modeConfig.name,
    modeMaxChallenges: modeConfig.maxChallenges,
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
    sessionError,
    language,
    solutions,
    stats,
    guesses,
    onEnter,
    onDelete,
    onTyping,
    setIsStatsModalOpen,
  };
};

export const useLetrixSession = useGameSession;
