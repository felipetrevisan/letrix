import { useCallback } from "react";
import { GameLanguage, GameState, GameStats } from "@/interfaces/game";
import {
  loadGameStateFromLocalStorage,
  saveGameStateToLocalStorage,
  saveStatsToLocalStorage,
} from "@/lib/localStorage";
import {
  loadGameStateFromCloud,
  saveGameStateToCloud,
  saveStatsToCloud,
} from "@/features/auth/lib/game-storage";

type UseGamePersistenceParams = {
  userId?: string;
  language: GameLanguage;
  modeName: string;
  puzzleDate: string;
  storageScope: string;
  isLatestGame: boolean;
};

export const useGamePersistence = ({
  userId,
  language,
  modeName,
  puzzleDate,
  storageScope,
  isLatestGame,
}: UseGamePersistenceParams) => {
  const loadSavedState = useCallback(async (): Promise<GameState[]> => {
    if (userId) {
      return loadGameStateFromCloud(userId, language, modeName, puzzleDate);
    }

    return loadGameStateFromLocalStorage(isLatestGame, storageScope);
  }, [isLatestGame, language, modeName, puzzleDate, storageScope, userId]);

  const persistGameState = useCallback(
    async (gameState: GameState[]) => {
      if (userId) {
        await saveGameStateToCloud(
          userId,
          language,
          modeName,
          puzzleDate,
          gameState,
        );
        return;
      }

      saveGameStateToLocalStorage(false, gameState, storageScope);
    },
    [language, modeName, puzzleDate, storageScope, userId],
  );

  const persistStats = useCallback(
    async (nextStats: GameStats) => {
      if (userId) {
        await saveStatsToCloud(userId, language, modeName, nextStats);
        return;
      }

      saveStatsToLocalStorage(nextStats, storageScope);
    },
    [language, modeName, storageScope, userId],
  );

  return {
    loadSavedState,
    persistGameState,
    persistStats,
  };
};
