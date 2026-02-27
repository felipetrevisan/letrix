import { hasSolvedAllBoards } from "@letrix/game-core";

type BuildSubmissionSnapshotParams = {
  currentGuessWord: string;
  solutionLength: number;
  guessesWords: string[];
  solutions: string[];
  maxChallenges: number;
  isGameWon: boolean;
};

type SubmissionSnapshot = {
  nextTries: string[];
  gameWonNow: boolean;
  canSaveGuess: boolean;
  reachedModeLimit: boolean;
  attemptsUsed: number;
};

export const buildSubmissionSnapshot = ({
  currentGuessWord,
  solutionLength,
  guessesWords,
  solutions,
  maxChallenges,
  isGameWon,
}: BuildSubmissionSnapshotParams): SubmissionSnapshot => {
  const nextTries = guessesWords.concat(currentGuessWord);
  const gameWonNow = hasSolvedAllBoards(solutions, nextTries);
  const canSaveGuess =
    currentGuessWord.length === solutionLength &&
    guessesWords.length < maxChallenges &&
    !isGameWon;
  const reachedModeLimit =
    !gameWonNow && guessesWords.length === maxChallenges - 1;

  return {
    nextTries,
    gameWonNow,
    canSaveGuess,
    reachedModeLimit,
    attemptsUsed: guessesWords.length,
  };
};
