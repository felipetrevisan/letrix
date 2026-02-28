"use client";

import { addDays } from "date-fns";
import type { Dispatch, SetStateAction } from "react";
import { useCallback } from "react";
import { toast } from "sonner";
import { REVEAL_TIME_MS } from "@/config/settings";
import type { RowAnimation } from "@/features/game/hooks/types";
import {
  createConstraintToast,
  createGameOverToast,
  createIncompleteWordToast,
  createInfiniteWinToast,
  createWinToast,
  createWordNotFoundToast,
} from "@/features/game/lib/game-toast";
import {
  buildEmptyGameState,
  buildGameStateSnapshot,
} from "@/features/game/session/state";
import { buildSubmissionSnapshot } from "@/features/game/session/submission";
import type {
  Config,
  Game,
  GameLanguage,
  GameMode,
  GameState,
  GameStats,
  Guess,
  Solution,
} from "@/interfaces/game";
import {
  alertsCopy,
  getGameOverMessage,
  getNotEnoughLettersMessage,
  getWinnerMessage,
} from "@/lib/copy";
import { addStatsForCompletedGame } from "@/lib/stats";
import {
  findFirstUnusedReveal,
  getSolution,
  isWordInWordList,
  localeAwareLowerCase,
  sanitizeSolutionPayload,
} from "@/lib/words";

type UseSubmitGuessParams = {
  gameEnded: boolean;
  solutions: Solution;
  isSubmittingGuess: boolean;
  setIsSubmittingGuess: (value: boolean) => void;
  currentGuess: Guess;
  modeConfig: Game;
  language: GameLanguage;
  triggerInvalidRowAnimation: () => void;
  clearCurrentRowClass: () => void;
  setInvalidGuesses: Dispatch<SetStateAction<string[]>>;
  storage?: Config | null;
  guesses: Guess[];
  currentRow: number;
  isGameWon: boolean;
  setIsRevealing: (value: boolean) => void;
  setRowAnimation: Dispatch<SetStateAction<RowAnimation | null>>;
  setSelectedTileIndex: Dispatch<SetStateAction<number>>;
  saveGuess: () => void;
  invalidGuesses: string[];
  isInfiniteMode: boolean;
  persistGameState: (gameState: GameState[]) => Promise<void>;
  resetCurrentGuess: () => void;
  clearGuesses: () => void;
  setCurrentRow: Dispatch<SetStateAction<number>>;
  setSolutions: Dispatch<SetStateAction<Solution>>;
  setStats: Dispatch<SetStateAction<GameStats>>;
  stats: GameStats;
  persistStats: (nextStats: GameStats) => Promise<void>;
  setIsGameWon: (value: boolean) => void;
  setIsGameOver: (value: boolean) => void;
  setIsStatsModalOpen: (open: boolean) => void;
  mode: GameMode;
};

export const useSubmitGuess = ({
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
}: UseSubmitGuessParams) => {
  const onEnter = useCallback(async () => {
    if (gameEnded || !solutions.solution[0] || isSubmittingGuess) {
      return;
    }

    setIsSubmittingGuess(true);

    if (currentGuess.word.length !== solutions.solution[0].length) {
      triggerInvalidRowAnimation();

      toast.error(
        getNotEnoughLettersMessage(modeConfig.wordLength),
        createIncompleteWordToast({
          onAutoClose: clearCurrentRowClass,
          onDismiss: clearCurrentRowClass,
        }),
      );
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

      toast.error(
        alertsCopy.wordNotFound,
        createWordNotFoundToast({
          onAutoClose: clearCurrentRowClass,
          onDismiss: clearCurrentRowClass,
        }),
      );
      setIsSubmittingGuess(false);
      return;
    }

    if (storage?.hardMode) {
      const firstMissingReveal = findFirstUnusedReveal();

      if (firstMissingReveal) {
        triggerInvalidRowAnimation();

        toast.error(
          firstMissingReveal,
          createConstraintToast({
            onAutoClose: clearCurrentRowClass,
            onDismiss: clearCurrentRowClass,
          }),
        );
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
            toast.success(
              "Acertou! Próxima palavra carregando...",
              createInfiniteWinToast({
                onAutoClose: clearCurrentRowClass,
                onDismiss: clearCurrentRowClass,
              }),
            );

            const nextRoundSolutions = await getSolution(
              addDays(solutions.solutionDate, 1),
              mode,
              language,
            );

            if (nextRoundSolutions.solution.length) {
              setSolutions(
                sanitizeSolutionPayload(nextRoundSolutions, {
                  boards: modeConfig.boards,
                  wordLength: modeConfig.wordLength,
                }),
              );
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
            createWinToast({
              action: {
                label: "Ver stats",
                onClick: () => setIsStatsModalOpen(true),
              },
              onAutoClose: clearCurrentRowClass,
              onDismiss: clearCurrentRowClass,
            }),
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

          toast.error(
            getGameOverMessage(solutions.solution),
            createGameOverToast({
              action: {
                label: "Ver stats",
                onClick: () => setIsStatsModalOpen(true),
              },
              onAutoClose: clearCurrentRowClass,
              onDismiss: clearCurrentRowClass,
            }),
          );

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
    isInfiniteMode,
    isSubmittingGuess,
    language,
    mode,
    modeConfig.maxChallenges,
    modeConfig.wordLength,
    persistGameState,
    persistStats,
    resetCurrentGuess,
    saveGuess,
    setCurrentRow,
    setInvalidGuesses,
    setIsGameOver,
    setIsGameWon,
    setIsRevealing,
    setIsStatsModalOpen,
    setIsSubmittingGuess,
    setRowAnimation,
    setSelectedTileIndex,
    setSolutions,
    setStats,
    solutions,
    stats,
    storage,
    triggerInvalidRowAnimation,
  ]);

  return { onEnter };
};
