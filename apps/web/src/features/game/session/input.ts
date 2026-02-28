import type { Guess } from "@/interfaces/game";
import { localeAwareLowerCase } from "@/lib/words";

type ComputeTypingUpdateParams = {
  value: string;
  currentSolution: string;
  maxChallenges: number;
  isGameLocked: boolean;
  guessesLength: number;
  currentGuess: Guess;
  currentRow: number;
  selectedTileIndex: number;
};

type ComputeDeleteUpdateParams = {
  currentGuess: Guess;
  selectedTileIndex: number;
  maxLength: number;
};

type GuessUpdateResult =
  | {
      shouldUpdate: false;
    }
  | {
      shouldUpdate: true;
      nextGuess: Guess;
      nextTileIndex: number;
    };

export const computeTypingUpdate = ({
  value,
  currentSolution,
  maxChallenges,
  isGameLocked,
  guessesLength,
  currentGuess,
  currentRow,
  selectedTileIndex,
}: ComputeTypingUpdateParams): GuessUpdateResult => {
  const nextLetter = localeAwareLowerCase(value);

  if (guessesLength >= maxChallenges || isGameLocked) {
    return { shouldUpdate: false };
  }

  const maxLength = currentSolution.length;
  if (!maxLength) {
    return { shouldUpdate: false };
  }

  const targetIndex = Math.min(Math.max(selectedTileIndex, 0), maxLength - 1);
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

  return {
    shouldUpdate: true,
    nextGuess: {
      ...currentGuess,
      row: currentRow,
      letters,
      word: letters.join(""),
    },
    nextTileIndex,
  };
};

export const computeDeleteUpdate = ({
  currentGuess,
  selectedTileIndex,
  maxLength,
}: ComputeDeleteUpdateParams): GuessUpdateResult => {
  if (!maxLength) {
    return { shouldUpdate: false };
  }

  const startIndex = Math.min(Math.max(selectedTileIndex, 0), maxLength - 1);
  const letters = Array.from(
    { length: maxLength },
    (_, index) => currentGuess.letters[index] ?? "",
  );

  if (!letters.some((letter) => !!letter)) {
    return {
      shouldUpdate: true,
      nextGuess: currentGuess,
      nextTileIndex: 0,
    };
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
      return {
        shouldUpdate: true,
        nextGuess: currentGuess,
        nextTileIndex: 0,
      };
    }
    targetIndex = lastFilledIndex;
  }

  letters[targetIndex] = "";

  return {
    shouldUpdate: true,
    nextGuess: {
      ...currentGuess,
      letters,
      word: letters.join(""),
    },
    nextTileIndex: targetIndex,
  };
};
