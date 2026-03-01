export type BoardRowStateParams = {
  rowIndex: number;
  currentRow: number;
  boardSolution: string;
  guessWordAtRow?: string;
  guessesWords: string[];
};

export const getBoardGuessedIndex = (
  guessesWords: string[],
  boardSolution: string,
) => {
  if (!boardSolution) {
    return -1;
  }

  return guessesWords.findIndex((guessWord) => guessWord === boardSolution);
};

export const getBoardRowState = ({
  rowIndex,
  currentRow,
  boardSolution,
  guessWordAtRow,
  guessesWords,
}: BoardRowStateParams) => {
  const guessedIndex = getBoardGuessedIndex(guessesWords, boardSolution);
  const isBoardSolved = guessedIndex !== -1;
  const isGuessedRow = !!boardSolution && guessWordAtRow === boardSolution;
  const isCurrentRow = currentRow === rowIndex;
  const isLockedAfterSolved = isBoardSolved && rowIndex > guessedIndex;
  const isInteractiveCurrentRow =
    isCurrentRow && !isGuessedRow && !isBoardSolved;

  const rowStatus = isGuessedRow
    ? "done"
    : isLockedAfterSolved
      ? "blank"
      : isCurrentRow
        ? "guessing"
        : currentRow < rowIndex
          ? "blank"
          : "complete";

  return {
    guessedIndex,
    isBoardSolved,
    isGuessedRow,
    isCurrentRow,
    isLockedAfterSolved,
    isInteractiveCurrentRow,
    rowStatus,
  };
};

type ResolveDisplayedRowLettersParams = {
  isBoardSolved: boolean;
  rowIndex: number;
  guessedIndex: number;
  isCurrentRow: boolean;
  currentGuessLetters: string[];
  savedGuessLetters: string[];
};

export const resolveDisplayedRowLetters = ({
  isBoardSolved,
  rowIndex,
  guessedIndex,
  isCurrentRow,
  currentGuessLetters,
  savedGuessLetters,
}: ResolveDisplayedRowLettersParams) => {
  if (isBoardSolved) {
    return rowIndex <= guessedIndex ? savedGuessLetters : [];
  }

  const hasSavedGuessAtRow = savedGuessLetters.length > 0;

  if (isCurrentRow && guessedIndex === -1 && !hasSavedGuessAtRow) {
    return currentGuessLetters;
  }

  return savedGuessLetters;
};
