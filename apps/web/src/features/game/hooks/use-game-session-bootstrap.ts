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
  hydratePracticeSolutionFromState,
  hydrateStandardSolutionFromState,
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
import {
  getPracticeSolution,
  getSolution,
  sanitizeSolutionPayload,
} from "@/lib/words";

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
  statsStorageScope: string;
  userId?: string;
  setStats: (stats: GameStats) => void;
  loadSavedState: () => Promise<GameState[]>;
  isInfiniteMode: boolean;
  isPracticeMode: boolean;
  selectedGameDate: Date;
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
  statsStorageScope,
  userId,
  setStats,
  loadSavedState,
  isInfiniteMode,
  isPracticeMode,
  selectedGameDate,
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
          "Não foi possível iniciar a rodada agora. Tente novamente em instantes.";
        toast.error(message);
        setSessionError(message);
        setIsHydrated(true);
        return;
      }

      const localStats = loadStats(mode, statsStorageScope);
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
        const storedStats = loadStatsFromLocalStorage(statsStorageScope);

        if (storedStats) {
          setStats(normalizeStats(storedStats, modeConfig.maxChallenges));
        }
      }

      const savedState = await loadSavedState();

      if (!isActive) {
        return;
      }

      if (isPracticeMode) {
        const restoredPracticeSolution = hydratePracticeSolutionFromState(
          savedState,
          {
            boards: modeConfig.boards,
            wordLength: modeConfig.wordLength,
            language,
          },
        );

        if (restoredPracticeSolution) {
          setSolutions(
            sanitizeSolutionPayload(restoredPracticeSolution, {
              boards: modeConfig.boards,
              wordLength: modeConfig.wordLength,
            }),
          );

          const savedTries = savedState[0]?.tries ?? [];
          const gameWasWon = hasSolvedAllBoards(
            restoredPracticeSolution.solution,
            savedTries,
          );

          if (gameWasWon) {
            setIsGameWon(true);
          }

          if (savedTries.length >= modeConfig.maxChallenges && !gameWasWon) {
            setIsGameOver(true);
          }

          updateGameFromSave(savedTries);
          setIsHydrated(true);
          return;
        }

        const practiceSolution = await getPracticeSolution(language);

        if (!isActive) {
          return;
        }

        if (!practiceSolution.solution.length) {
          const message =
            "Não foi possível carregar uma rodada de prática agora. Tente novamente em instantes.";
          toast.error(message);
          setSessionError(message);
          setIsHydrated(true);
          return;
        }

        setSolutions(
          sanitizeSolutionPayload(practiceSolution, {
            boards: modeConfig.boards,
            wordLength: modeConfig.wordLength,
          }),
        );
        void persistGameState(buildEmptyGameState(practiceSolution));
        setTimeout(() => {
          setIsInfoModalOpen(true);
        }, REVEAL_TIME_MS);
        setIsHydrated(true);
        return;
      }

      const baseSolutions = await getSolution(selectedGameDate, mode, language);

      if (!isActive) {
        return;
      }

      if (!baseSolutions.solution.length) {
        const message =
          "Não foi possível carregar a palavra do dia agora. Tente novamente em instantes.";
        toast.error(message);
        setSessionError(message);
        setIsHydrated(true);
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

        setSolutions(
          sanitizeSolutionPayload(restoredSolutions, {
            boards: modeConfig.boards,
            wordLength: modeConfig.wordLength,
          }),
        );

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
              setSolutions(
                sanitizeSolutionPayload(nextRoundSolutions, {
                  boards: modeConfig.boards,
                  wordLength: modeConfig.wordLength,
                }),
              );
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

      if (!savedState.length) {
        setSolutions(
          sanitizeSolutionPayload(baseSolutions, {
            boards: modeConfig.boards,
            wordLength: modeConfig.wordLength,
          }),
        );
        setTimeout(() => {
          setIsInfoModalOpen(true);
        }, REVEAL_TIME_MS);
        setIsHydrated(true);
        return;
      }

      const restoredSolutions =
        hydrateStandardSolutionFromState(baseSolutions, savedState, {
          boards: modeConfig.boards,
          wordLength: modeConfig.wordLength,
        }) ?? baseSolutions;

      setSolutions(
        sanitizeSolutionPayload(restoredSolutions, {
          boards: modeConfig.boards,
          wordLength: modeConfig.wordLength,
        }),
      );

      const savedTries = savedState[0]?.tries ?? [];
      const gameWasWon = hasSolvedAllBoards(
        restoredSolutions.solution,
        savedTries,
      );

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
    isPracticeMode,
    language,
    loadSavedState,
    loading,
    mode,
    modeConfig.boards,
    modeConfig.maxChallenges,
    modeConfig.name,
    modeConfig.wordLength,
    persistGameState,
    resetAutoOpenStats,
    setIsGameOver,
    setIsGameWon,
    setIsHydrated,
    setIsInfoModalOpen,
    setIsSubmittingGuess,
    setSessionError,
    setSolutions,
    setStats,
    statsStorageScope,
    selectedGameDate,
    updateGameFromSave,
    userId,
  ]);
};
