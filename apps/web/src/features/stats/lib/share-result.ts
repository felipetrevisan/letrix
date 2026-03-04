import type { Guess } from "@/interfaces/game";
import { getGuessStatuses } from "@/lib/statuses";
import { gameNames } from "@/lib/copy";
import { getIndex } from "@/lib/words";

type ShareGameResultParams = {
  title: string;
  text: string;
  url?: string;
};

type BuildShareResultTextParams = {
  modeName: string;
  puzzleDate: string;
  guesses: Guess[];
  solutions: string[];
  maxChallenges: number;
  currentStreak: number;
  isPracticeMode?: boolean;
  isInfiniteMode?: boolean;
};

const statusEmojiMap = {
  absent: "⬛",
  present: "🟨",
  correct: "🟩",
} as const;

const boardLabelMap = {
  0: "1️⃣",
  1: "2️⃣",
  2: "3️⃣",
  3: "4️⃣",
  4: "5️⃣",
  5: "6️⃣",
} as const;

const formatPuzzleLabel = ({
  modeName,
  puzzleDate,
  isPracticeMode = false,
  isInfiniteMode = false,
}: Pick<
  BuildShareResultTextParams,
  "modeName" | "puzzleDate" | "isPracticeMode" | "isInfiniteMode"
>) => {
  const readableMode =
    gameNames[modeName as keyof typeof gameNames] ?? modeName;

  if (isPracticeMode) {
    return `Letrix ${readableMode}`;
  }

  if (isInfiniteMode) {
    return `Letrix ${readableMode}`;
  }

  const puzzleIndex = getIndex(new Date(`${puzzleDate}T00:00:00`)) + 1;
  return `Letrix ${readableMode} #${puzzleIndex}`;
};

const getBoardGuesses = (guesses: Guess[], solution: string) => {
  const words = guesses.map((guess) => guess.word);
  const solvedAtIndex = words.findIndex((word) => word === solution);

  if (solvedAtIndex >= 0) {
    return words.slice(0, solvedAtIndex + 1);
  }

  return words;
};

const buildEmojiGrid = (guesses: string[], solution: string) => {
  return guesses
    .map((guess) =>
      getGuessStatuses(Array.from(guess), solution)
        .map((status) => statusEmojiMap[status])
        .join(""),
    )
    .join("\n");
};

export const buildShareResultText = ({
  modeName,
  puzzleDate,
  guesses,
  solutions,
  maxChallenges,
  currentStreak,
  isPracticeMode = false,
  isInfiniteMode = false,
}: BuildShareResultTextParams) => {
  const solvedBoards = solutions.reduce((count, solution) => {
    return guesses.some((guess) => guess.word === solution) ? count + 1 : count;
  }, 0);

  const attemptsLabel =
    solutions.length === 1
      ? `${guesses.length}/${maxChallenges}`
      : `${solvedBoards}/${solutions.length}`;

  const header = `${formatPuzzleLabel({
    modeName,
    puzzleDate,
    isPracticeMode,
    isInfiniteMode,
  })} ${attemptsLabel} 🔥 ${currentStreak}`;

  const boards = solutions
    .map((solution, boardIndex) => {
      const boardGuesses = getBoardGuesses(guesses, solution);
      const grid = buildEmojiGrid(boardGuesses, solution);

      if (!grid) {
        return null;
      }

      if (solutions.length === 1) {
        return grid;
      }

      const boardLabel =
        boardLabelMap[boardIndex as keyof typeof boardLabelMap] ??
        `Tabuleiro ${boardIndex + 1}`;

      return `${boardLabel}\n${grid}`;
    })
    .filter(Boolean)
    .join("\n\n");

  return [header, boards].filter(Boolean).join("\n\n");
};

const canUseNavigatorShare = () => {
  return (
    typeof navigator !== "undefined" && typeof navigator.share === "function"
  );
};

const canUseClipboard = () => {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.clipboard &&
    typeof navigator.clipboard.writeText === "function"
  );
};

export const shareGameResult = async ({
  title,
  text,
  url,
}: ShareGameResultParams) => {
  if (canUseNavigatorShare()) {
    await navigator.share({ title, text, url });
    return "shared" as const;
  }

  if (canUseClipboard()) {
    await navigator.clipboard.writeText(url ? `${text}\n${url}` : text);
    return "copied" as const;
  }

  throw new Error("sharing-unavailable");
};
