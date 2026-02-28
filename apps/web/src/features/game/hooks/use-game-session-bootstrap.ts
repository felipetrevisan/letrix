"use client";

import { hasSolvedAllBoards } from "@letrix/game-core";
import { addDays } from "date-fns";
import { useEffect } from "react";
import { toast } from "sonner";
import { REVEAL_TIME_MS } from "@/config/settings";
import { loadStatsFromCloud } from "@/features/auth/lib/game-storage";
import { isSupabaseConfigured } from "@/features/auth/lib/supabase-client";
import {
  buildEmptyGameState,
  resolveInfiniteBootstrapState,
} from "@/features/game/session/state";
import type {
  Game,
  GameLanguage,
  GameMode,
  GameState,
  GameStats,
  Solution,
} from "@/interfaces/game";
import { loadStatsFromLocalStorage } from "@/lib/localStorage";
import { loadStats, normalizeStats } from "@/lib/stats";
import { getGameDate, getSolution } from "@/lib/words";

type UseGameSessionBootstrapParams = {
  isAuthReady: boolean;
  closeMenu: () => void;
  resetAutoOpenStats: () => void;
  changeGameMode: (mode: GameMode) => void;
  mode: GameMode;
  language: GameLanguage;
  loading: () => void;
  setIsGameOver: (value: boolean) => void;
  setIsGameWon: (value: boolean) => void;
  setIsHydrated: (value: boolean) => void;
  setIsSubmittingGuess: (value: boolean) => void;
  setSessionError: (value: string | null) => void;
  modeConfig: Game;
  storageScope: string;
  userId?: string;
  setStats: (stats: GameStats) => void;
  loadSavedState: () => Promise<GameState[]>;
  isInfiniteMode: boolean;
  setSolutions: (solution: Solution) => void;
  updateGameFromSave: (savedGuesses: string[]) => void;
  persistGameState: (state: GameState[]) => Promise<void>;
  setIsInfoModalOpen: (open: boolean) => void;
};

export const useGameSessionBootstrap = ({
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
  userId,
  setStats,
  loadSavedState,
  isInfiniteMode,
  setSolutions,
  updateGameFromSave,
  persistGameState,
  setIsInfoModalOpen,
}: UseGameSessionBootstrapParams) => {
  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    let isActive = true;

    const bootstrapSession = async () => {
      closeMenu();
      resetAutoOpenStats();
      changeGameMode(mode);
      loading();
      setIsGameOver(false);
      setIsGameWon(false);
      setIsHydrated(false);
      setIsSubmittingGuess(false);
      setSessionError(null);

      if (!isSupabaseConfigured()) {
        const message =
          "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_PROJECT_ID e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY na Vercel.";
        toast.error(message);
        setSessionError(message);
        setIsHydrated(true);
        return;
      }

      const gameDate = getGameDate();
      const baseSolutions = await getSolution(gameDate, mode, language);

      if (!isActive) {
        return;
      }

      if (!baseSolutions.solution.length) {
        const message =
          "Não foi possível carregar a palavra do dia. Verifique o schema letrix exposto na API e as permissões de leitura das tabelas.";
        toast.error(message);
        setSessionError(message);
        setIsHydrated(true);
        return;
      }

      const localStats = loadStats(mode, storageScope);
      setStats(localStats);

      if (userId) {
        const cloudStats = await loadStatsFromCloud(
          userId,
          language,
          modeConfig.name,
        );

        if (isActive && cloudStats) {
          setStats(normalizeStats(cloudStats, modeConfig.maxChallenges));
        }
      } else {
        const storedStats = loadStatsFromLocalStorage(storageScope);

        if (storedStats) {
          setStats(normalizeStats(storedStats, modeConfig.maxChallenges));
        }
      }

      const savedState = await loadSavedState();

      if (!isActive) {
        return;
      }

      if (isInfiniteMode) {
        const {
          hasSavedState,
          restoredSolutions,
          savedTries,
          shouldAdvanceToNextRound,
        } = resolveInfiniteBootstrapState({
          baseSolutions,
          savedState,
        });

        setSolutions(restoredSolutions);

        if (hasSavedState) {
          if (shouldAdvanceToNextRound) {
            const nextRoundSolutions = await getSolution(
              addDays(restoredSolutions.solutionDate, 1),
              mode,
              language,
            );

            if (!isActive) {
              return;
            }

            if (nextRoundSolutions.solution.length) {
              setSolutions(nextRoundSolutions);
              updateGameFromSave([]);
              void persistGameState(buildEmptyGameState(nextRoundSolutions));
            } else {
              updateGameFromSave(savedTries);
            }
          } else {
            updateGameFromSave(savedTries);
            const reachedInfiniteLimit =
              savedTries.length >= modeConfig.maxChallenges &&
              !hasSolvedAllBoards(restoredSolutions.solution, savedTries);

            if (reachedInfiniteLimit) {
              setIsGameOver(true);
            }
          }
        } else {
          setTimeout(() => {
            setIsInfoModalOpen(true);
          }, REVEAL_TIME_MS);
        }

        setIsHydrated(true);
        return;
      }

      setSolutions(baseSolutions);

      if (!savedState.length) {
        setTimeout(() => {
          setIsInfoModalOpen(true);
        }, REVEAL_TIME_MS);
        setIsHydrated(true);
        return;
      }

      const hasCurrentSolutions = baseSolutions.solution.every(
        (solution, index) => savedState[index]?.solution === solution,
      );

      if (!hasCurrentSolutions) {
        setIsHydrated(true);
        return;
      }

      const savedTries = savedState[0]?.tries ?? [];
      const gameWasWon = hasSolvedAllBoards(baseSolutions.solution, savedTries);

      if (gameWasWon) {
        setIsGameWon(true);
      }

      if (savedTries.length >= modeConfig.maxChallenges && !gameWasWon) {
        setIsGameOver(true);
      }

      updateGameFromSave(savedTries);
      setIsHydrated(true);
    };

    void bootstrapSession();

    return () => {
      isActive = false;
    };
  }, [
    changeGameMode,
    closeMenu,
    isAuthReady,
    isInfiniteMode,
    language,
    loadSavedState,
    loading,
    mode,
    modeConfig.maxChallenges,
    modeConfig.name,
    persistGameState,
    resetAutoOpenStats,
    setIsGameOver,
    setIsGameWon,
    setIsHydrated,
    setIsInfoModalOpen,
    setIsSubmittingGuess,
    setSolutions,
    setStats,
    storageScope,
    updateGameFromSave,
    userId,
  ]);
};
