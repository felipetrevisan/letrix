"use client";

import { formatISO, isSameDay, parseISO, startOfToday } from "date-fns";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { gameSettings } from "@/config/game";
import { useApp } from "@/contexts/AppContext";
import { useGame } from "@/contexts/GameContext";
import {
  saveDailyLeaderboardEntry,
  type SaveDailyLeaderboardEntryInput,
} from "@/features/auth/lib/game-storage";
import {
  getUserAvatarUrl,
  getUserDisplayName,
} from "@/features/auth/lib/user-profile";
import type { RowAnimation } from "@/features/game/hooks/types";
import { useAutoOpenStats } from "@/features/game/hooks/use-auto-open-stats";
import { useGameSessionBootstrap } from "@/features/game/hooks/use-game-session-bootstrap";
import { useSubmitGuess } from "@/features/game/hooks/use-submit-guess";
import { buildEmptyGameState } from "@/features/game/session/state";
import {
  type StatsAchievement,
  getNewlyUnlockedAchievements,
} from "@/features/stats/lib/stats-insights";
import { useGamePersistence } from "@/hooks/session/use-game-persistence";
import { GameMode, type GameStats } from "@/interfaces/game";
import { gameNames } from "@/lib/copy";
import { isEndGame } from "@/lib/game";
import {
  getGameDate,
  getPracticeSolution,
  resolveLanguageFromLocale,
  sanitizeSolutionPayload,
} from "@/lib/words";

export const useGameSession = (mode: GameMode) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = pathname.split("/").filter(Boolean)[0] ?? "pt";
  const language = resolveLanguageFromLocale(locale);
  const challengeDateParam = searchParams.get("challenge");

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

  const modeConfig = gameSettings[mode];
  const isInfiniteMode = modeConfig.name === "infinite";
  const isPracticeMode = modeConfig.name === "practice";
  const selectedGameDate = useMemo(() => {
    if (!challengeDateParam) {
      return getGameDate();
    }

    const parsedDate = parseISO(challengeDateParam);

    if (Number.isNaN(parsedDate.valueOf()) || parsedDate > startOfToday()) {
      return getGameDate();
    }

    return parsedDate;
  }, [challengeDateParam]);
  const isLatestGame = isSameDay(selectedGameDate, startOfToday());
  const puzzleDate = isPracticeMode
    ? "practice"
    : formatISO(selectedGameDate, { representation: "date" });
  const statsStorageScope = `${modeConfig.name}-${language}`;
  const stateStorageScope = isPracticeMode
    ? `${modeConfig.name}-${language}`
    : `${modeConfig.name}-${language}-${puzzleDate}`;
  const { loadSavedState, persistGameState, persistStats } = useGamePersistence(
    {
      userId: user?.id,
      language,
      modeName: modeConfig.name,
      puzzleDate,
      stateStorageScope,
      statsStorageScope,
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
  const [achievementQueue, setAchievementQueue] = useState<StatsAchievement[]>(
    [],
  );
  const [activeAchievementUnlock, setActiveAchievementUnlock] =
    useState<StatsAchievement | null>(null);
  const [isAchievementBannerVisible, setIsAchievementBannerVisible] =
    useState(false);

  const gameEnded = useMemo(
    () => isEndGame(isGameWon, isGameOver),
    [isGameWon, isGameOver],
  );

  const clearCurrentRowClass = useCallback(() => {
    setCurrentRowClass("");
    setRowAnimation(null);
  }, []);

  useEffect(() => {
    if (activeAchievementUnlock || !achievementQueue.length) {
      return;
    }

    const [nextAchievement, ...restQueue] = achievementQueue;
    setActiveAchievementUnlock(nextAchievement);
    setIsAchievementBannerVisible(true);
    setAchievementQueue(restQueue);
  }, [achievementQueue, activeAchievementUnlock]);

  useEffect(() => {
    if (!activeAchievementUnlock || !isAchievementBannerVisible) {
      return;
    }

    const hideTimeoutId = window.setTimeout(() => {
      setIsAchievementBannerVisible(false);
    }, 3200);

    const clearTimeoutId = window.setTimeout(() => {
      setActiveAchievementUnlock(null);
    }, 3900);

    return () => {
      window.clearTimeout(hideTimeoutId);
      window.clearTimeout(clearTimeoutId);
    };
  }, [activeAchievementUnlock, isAchievementBannerVisible]);

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
    statsStorageScope,
    userId: user?.id,
    setStats,
    loadSavedState,
    isInfiniteMode,
    isPracticeMode,
    selectedGameDate,
    setSolutions,
    updateGameFromSave,
    persistGameState,
    setIsInfoModalOpen,
  });

  const persistDailyLeaderboard = useCallback(
    async ({
      attemptsUsed,
      isWin,
      solvedBoards,
    }: Pick<
      SaveDailyLeaderboardEntryInput,
      "attemptsUsed" | "isWin" | "solvedBoards"
    >) => {
      if (!user?.id || isInfiniteMode || isPracticeMode) {
        return;
      }

      await saveDailyLeaderboardEntry({
        userId: user.id,
        language,
        modeName: modeConfig.name,
        puzzleDate,
        attemptsUsed,
        maxAttempts: modeConfig.maxChallenges,
        solvedBoards,
        totalBoards: modeConfig.boards,
        isWin,
        displayName: getUserDisplayName(user),
        avatarUrl: getUserAvatarUrl(user),
      });
    },
    [
      isInfiniteMode,
      isPracticeMode,
      language,
      modeConfig.boards,
      modeConfig.maxChallenges,
      modeConfig.name,
      puzzleDate,
      user,
    ],
  );

  const notifyAchievementsUnlocked = useCallback(
    (previousStats: GameStats, nextStats: GameStats) => {
      const newlyUnlockedAchievements = getNewlyUnlockedAchievements(
        previousStats,
        nextStats,
        modeConfig.maxChallenges,
      );

      if (!newlyUnlockedAchievements.length) {
        return;
      }

      setAchievementQueue((currentQueue) => [
        ...currentQueue,
        ...newlyUnlockedAchievements,
      ]);
    },
    [modeConfig.maxChallenges],
  );

  const startPracticeRound = useCallback(async () => {
    if (!isPracticeMode || isSubmittingGuess) {
      return;
    }

    resetAutoOpenStats();
    setSessionError(null);
    setCurrentRowClass("");
    setRowAnimation(null);
    setIsRevealing(false);
    setIsGameOver(false);
    setIsGameWon(false);
    setIsStatsModalOpen(false);
    setIsSubmittingGuess(true);

    const nextPracticeSolution = await getPracticeSolution(language, {
      excludeWord: solutions.solution[0] ?? null,
    });

    if (!nextPracticeSolution.solution.length) {
      setSessionError(
        "Não foi possível carregar uma nova rodada de prática agora. Tente novamente em instantes.",
      );
      setIsSubmittingGuess(false);
      return;
    }

    const sanitizedSolution = sanitizeSolutionPayload(nextPracticeSolution, {
      boards: modeConfig.boards,
      wordLength: modeConfig.wordLength,
    });

    setSolutions(sanitizedSolution);
    clearGuesses();
    setCurrentRow(0);
    resetCurrentGuess();
    setInvalidGuesses([]);
    setSelectedTileIndex(0);
    await persistGameState(buildEmptyGameState(sanitizedSolution));
    setIsSubmittingGuess(false);
  }, [
    clearGuesses,
    isPracticeMode,
    isSubmittingGuess,
    language,
    modeConfig.boards,
    modeConfig.wordLength,
    persistGameState,
    resetAutoOpenStats,
    resetCurrentGuess,
    setCurrentRow,
    setCurrentRowClass,
    setInvalidGuesses,
    setIsGameOver,
    setIsGameWon,
    setIsRevealing,
    setIsStatsModalOpen,
    setIsSubmittingGuess,
    setRowAnimation,
    setSelectedTileIndex,
    setSessionError,
    setSolutions,
    solutions.solution,
  ]);

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
    isPracticeMode,
    persistGameState,
    resetCurrentGuess,
    clearGuesses,
    setCurrentRow,
    setSolutions,
    setStats,
    stats,
    persistStats,
    persistDailyLeaderboard,
    notifyAchievementsUnlocked,
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
    isPracticeMode,
    isInfiniteMode,
    activeAchievementUnlock,
    isAchievementBannerVisible,
    puzzleDate,
    modeName: modeConfig.name,
    startPracticeRound,
    onEnter,
    onDelete,
    onTyping,
    setIsStatsModalOpen,
  };
};

export const useLetrixSession = useGameSession;
