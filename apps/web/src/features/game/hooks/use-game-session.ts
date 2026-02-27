"use client";

import {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { addDays, formatISO } from "date-fns";
import { Sparkles, TriangleAlert } from "lucide-react";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { hasSolvedAllBoards } from "@letrix/game-core";
import { REVEAL_TIME_MS } from "@/config/settings";
import { gameSettings } from "@/config/game";
import { useApp } from "@/contexts/AppContext";
import { useGame } from "@/contexts/GameContext";
import { GameMode } from "@/interfaces/game";
import { isEndGame } from "@/lib/game";
import { loadStatsFromLocalStorage } from "@/lib/localStorage";
import { loadStatsFromCloud } from "@/features/auth/lib/game-storage";
import {
  addStatsForCompletedGame,
  loadStats,
  normalizeStats,
} from "@/lib/stats";
import {
  findFirstUnusedReveal,
  getGameDate,
  getIsLatestGame,
  getSolution,
  isWordInWordList,
  localeAwareLowerCase,
  resolveLanguageFromLocale,
} from "@/lib/words";
import {
  buildEmptyGameState,
  buildGameStateSnapshot,
  resolveInfiniteBootstrapState,
} from "@/features/game/session/state";
import { buildSubmissionSnapshot } from "@/features/game/session/submission";
import { useGamePersistence } from "@/hooks/session/use-game-persistence";
import {
  alertsCopy,
  gameNames,
  getGameOverMessage,
  getNotEnoughLettersMessage,
  getWinnerMessage,
} from "@/lib/copy";

type RowAnimation = "invalid" | "happy" | "revealing";

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
  const hasAutoOpenedStatsRef = useRef(false);

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

  useEffect(() => {
    if (!isAuthReady) {
      return;
    }

    let isActive = true;

    const bootstrapSession = async () => {
      closeMenu();
      hasAutoOpenedStatsRef.current = false;
      changeGameMode(mode);
      loading();
      setIsGameOver(false);
      setIsGameWon(false);
      setIsHydrated(false);
      setIsSubmittingGuess(false);

      const gameDate = getGameDate();
      const baseSolutions = await getSolution(gameDate, mode, language);

      if (!isActive) {
        return;
      }

      if (!baseSolutions.solution.length) {
        toast.error("Palavra do dia indisponível para este idioma/modo.");
        setIsHydrated(true);
        return;
      }

      const localStats = loadStats(mode, storageScope);
      setStats(localStats);

      if (user?.id) {
        const cloudStats = await loadStatsFromCloud(
          user.id,
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
    setIsInfoModalOpen,
    setSolutions,
    setStats,
    storageScope,
    updateGameFromSave,
    user?.id,
  ]);

  useEffect(() => {
    if (!gameEnded || isLoading || hasAutoOpenedStatsRef.current) {
      return;
    }

    hasAutoOpenedStatsRef.current = true;
    const timeout = setTimeout(
      () => {
        openMenu();
        setIsStatsModalOpen(true);
      },
      REVEAL_TIME_MS * (solutions.solution[0]?.length ?? 5),
    );

    return () => clearTimeout(timeout);
  }, [gameEnded, isLoading, openMenu, setIsStatsModalOpen, solutions.solution]);

  const onEnter = useCallback(async () => {
    if (gameEnded || !solutions.solution[0] || isSubmittingGuess) {
      return;
    }

    setIsSubmittingGuess(true);

    if (currentGuess.word.length !== solutions.solution[0].length) {
      triggerInvalidRowAnimation();

      toast.error(getNotEnoughLettersMessage(modeConfig.wordLength), {
        description: "Complete todas as casas da linha atual.",
        icon: createElement(TriangleAlert, { className: "size-4" }),
        className: "toast-word-miss",
        onAutoClose: clearCurrentRowClass,
        onDismiss: clearCurrentRowClass,
        position: "top-center",
        dismissible: true,
        duration: 1000,
      });
      setIsSubmittingGuess(false);
      return;
    }

    const hasValidWord = await isWordInWordList(
      currentGuess.word,
      language,
      modeConfig.wordLength,
    );

    if (!hasValidWord) {
      triggerInvalidRowAnimation();
      setInvalidGuesses((prev) => [
        ...prev,
        localeAwareLowerCase(currentGuess.word),
      ]);

      toast.error(alertsCopy.wordNotFound, {
        description: "Tente outra combinação.",
        icon: createElement(TriangleAlert, { className: "size-4" }),
        className: "toast-word-miss",
        onAutoClose: clearCurrentRowClass,
        onDismiss: clearCurrentRowClass,
        position: "top-center",
        dismissible: true,
        duration: 1100,
      });
      setIsSubmittingGuess(false);
      return;
    }

    if (storage?.hardMode) {
      const firstMissingReveal = findFirstUnusedReveal();

      if (firstMissingReveal) {
        triggerInvalidRowAnimation();

        toast.error(firstMissingReveal, {
          onAutoClose: clearCurrentRowClass,
          onDismiss: clearCurrentRowClass,
          position: "top-center",
          dismissible: true,
          duration: 1000,
        });
        setIsSubmittingGuess(false);
        return;
      }
    }

    setIsRevealing(true);
    setRowAnimation("revealing");

    window.setTimeout(() => {
      void (async () => {
        const guessesWords = guesses.map((guess) => guess.word);
        const {
          nextTries,
          gameWonNow,
          canSaveGuess,
          reachedModeLimit,
          attemptsUsed,
        } = buildSubmissionSnapshot({
          currentGuessWord: currentGuess.word,
          solutionLength: solutions.solution[0].length,
          guessesWords,
          solutions: solutions.solution,
          maxChallenges: modeConfig.maxChallenges,
          isGameWon,
        });

        setIsRevealing(false);
        setRowAnimation(null);
        setSelectedTileIndex(0);

        if (!canSaveGuess) {
          setIsSubmittingGuess(false);
          return;
        }

        saveGuess();

        const gameState = buildGameStateSnapshot({
          stateSolutions: solutions,
          nextTries,
          currentTry: currentGuess.word,
          row: currentRow,
          invalids: invalidGuesses,
          isWin: gameWonNow,
          isUnlimitedMode: isInfiniteMode,
          maxChallenges: modeConfig.maxChallenges,
        });

        await persistGameState(gameState);

        resetCurrentGuess();
        setInvalidGuesses([]);

        if (gameWonNow) {
          const nextStats = addStatsForCompletedGame(
            stats,
            attemptsUsed,
            modeConfig.maxChallenges,
            {
              isUnlimitedMode: false,
            },
          );

          setStats(nextStats);
          await persistStats(nextStats);
          setRowAnimation("happy");

          if (isInfiniteMode) {
            toast.success("Acertou! Próxima palavra carregando...", {
              description: "Continue a sequência no modo infinito.",
              icon: createElement(Sparkles, { className: "size-4" }),
              className: "toast-win",
              onAutoClose: clearCurrentRowClass,
              onDismiss: clearCurrentRowClass,
              position: "top-center",
              duration: 1000,
            });

            const nextRoundSolutions = await getSolution(
              addDays(solutions.solutionDate, 1),
              mode,
              language,
            );

            if (nextRoundSolutions.solution.length) {
              setSolutions(nextRoundSolutions);
              clearGuesses();
              setCurrentRow(0);
              resetCurrentGuess();
              setInvalidGuesses([]);
              setSelectedTileIndex(0);
              await persistGameState(buildEmptyGameState(nextRoundSolutions));
            } else {
              toast.error("Não foi possível carregar a próxima palavra.");
            }

            setIsSubmittingGuess(false);
            return;
          }

          setIsGameWon(true);

          toast.success(
            getWinnerMessage(modeConfig.maxChallenges - currentRow),
            {
              description: "Palavra correta. Excelente jogada.",
              icon: createElement(Sparkles, { className: "size-4" }),
              className: "toast-win",
              action: {
                label: "Ver stats",
                onClick: () => setIsStatsModalOpen(true),
              },
              onAutoClose: clearCurrentRowClass,
              onDismiss: clearCurrentRowClass,
              position: "top-center",
              duration: 1000,
            },
          );

          setIsSubmittingGuess(false);
          return;
        }

        if (reachedModeLimit) {
          const nextStats = addStatsForCompletedGame(
            stats,
            attemptsUsed + 1,
            modeConfig.maxChallenges,
            {
              isUnlimitedMode: false,
            },
          );

          setStats(nextStats);
          await persistStats(nextStats);
          setIsGameOver(true);

          toast.error(getGameOverMessage(solutions.solution), {
            description: "Fim das tentativas desta rodada.",
            action: {
              label: "Ver stats",
              onClick: () => setIsStatsModalOpen(true),
            },
            onAutoClose: clearCurrentRowClass,
            onDismiss: clearCurrentRowClass,
            position: "top-center",
          });

          setIsSubmittingGuess(false);
          return;
        }

        setCurrentRow((row) => row + 1);
        setIsSubmittingGuess(false);
      })();
    }, REVEAL_TIME_MS * solutions.solution[0].length);
  }, [
    clearCurrentRowClass,
    clearGuesses,
    currentGuess,
    currentRow,
    gameEnded,
    guesses,
    invalidGuesses,
    isGameWon,
    isSubmittingGuess,
    isInfiniteMode,
    language,
    mode,
    modeConfig.maxChallenges,
    modeConfig.wordLength,
    persistGameState,
    persistStats,
    resetCurrentGuess,
    saveGuess,
    setCurrentRow,
    setIsStatsModalOpen,
    setInvalidGuesses,
    setSelectedTileIndex,
    setSolutions,
    setStats,
    solutions,
    stats,
    storage?.hardMode,
    triggerInvalidRowAnimation,
  ]);

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
