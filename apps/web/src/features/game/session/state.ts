import { addDays } from "date-fns";
import { hasSolvedAllBoards } from "@letrix/game-core";
import { GameState, Solution } from "@/interfaces/game";
import { normalizeWord, unicodeLength } from "@/lib/words";

type BuildSnapshotParams = {
  stateSolutions: Solution;
  nextTries: string[];
  currentTry: string;
  row: number;
  invalids: string[];
  isWin: boolean;
  isUnlimitedMode: boolean;
  maxChallenges: number;
};

type ResolveInfiniteBootstrapParams = {
  baseSolutions: Solution;
  savedState: GameState[];
};

type ResolveInfiniteBootstrapStateResult = {
  hasSavedState: boolean;
  restoredSolutions: Solution;
  savedTries: string[];
  shouldAdvanceToNextRound: boolean;
};

type StandardHydrationConfig = {
  boards: number;
  wordLength: number;
};

export const hydrateInfiniteSolutionFromState = (
  fallbackSolution: Solution,
  savedState: GameState[],
): Solution => {
  const fallbackDefinitions = fallbackSolution.definitions ?? [];
  const hydratedSolutions = savedState
    .map((state) => normalizeWord(state.solution))
    .filter((solution) => solution.length > 0);

  if (!hydratedSolutions.length) {
    return fallbackSolution;
  }

  const hydratedDisplaySolutions = savedState.map(
    (state, index) => state.displaySolution ?? hydratedSolutions[index],
  );
  const hydratedDefinitions = savedState.map(
    (state, index) => state.definition ?? fallbackDefinitions[index] ?? null,
  );
  const restoredIndex = savedState[0]?.curday ?? fallbackSolution.solutionIndex;
  const indexDelta = restoredIndex - fallbackSolution.solutionIndex;
  const restoredDate = addDays(fallbackSolution.solutionDate, indexDelta);

  return {
    ...fallbackSolution,
    solution: hydratedSolutions,
    displaySolution: hydratedDisplaySolutions,
    definitions: hydratedDefinitions,
    solutionIndex: restoredIndex,
    solutionDate: restoredDate,
    tomorrow: addDays(restoredDate, 1).valueOf(),
  };
};

export const hydrateStandardSolutionFromState = (
  fallbackSolution: Solution,
  savedState: GameState[],
  { boards, wordLength }: StandardHydrationConfig,
): Solution | null => {
  if (!savedState.length || savedState.length !== boards) {
    return null;
  }

  const currentDay = fallbackSolution.solutionIndex;
  const isSamePuzzleDay = savedState.every(
    (state) => state.curday === currentDay,
  );

  if (!isSamePuzzleDay) {
    return null;
  }

  const hydratedSolutions = savedState
    .map((state) => normalizeWord(state.solution))
    .filter((solution) => unicodeLength(solution) === wordLength);

  if (hydratedSolutions.length !== boards) {
    return null;
  }

  return {
    ...fallbackSolution,
    solution: hydratedSolutions,
    displaySolution: savedState.map(
      (state, index) => state.displaySolution ?? hydratedSolutions[index],
    ),
    definitions: savedState.map((state) => state.definition ?? null),
  };
};

export const buildEmptyGameState = (stateSolutions: Solution): GameState[] => {
  return stateSolutions.solution.map((solution, index) => ({
    curRow: 0,
    curTry: "",
    invalids: [],
    gameOver: false,
    won: false,
    tries: [],
    solution,
    displaySolution: stateSolutions.displaySolution[index] ?? solution,
    definition: stateSolutions.definitions?.[index] ?? null,
    curday: stateSolutions.solutionIndex,
  }));
};

export const resolveInfiniteBootstrapState = ({
  baseSolutions,
  savedState,
}: ResolveInfiniteBootstrapParams): ResolveInfiniteBootstrapStateResult => {
  const hasSavedState = savedState.length > 0;
  const restoredSolutions = hasSavedState
    ? hydrateInfiniteSolutionFromState(baseSolutions, savedState)
    : baseSolutions;
  const savedTries = hasSavedState ? savedState[0]?.tries ?? [] : [];
  const shouldAdvanceToNextRound =
    hasSavedState && hasSolvedAllBoards(restoredSolutions.solution, savedTries);

  return {
    hasSavedState,
    restoredSolutions,
    savedTries,
    shouldAdvanceToNextRound,
  };
};

export const buildGameStateSnapshot = ({
  stateSolutions,
  nextTries,
  currentTry,
  row,
  invalids,
  isWin,
  isUnlimitedMode,
  maxChallenges,
}: BuildSnapshotParams): GameState[] => {
  const shouldMarkGameOver =
    !isUnlimitedMode && !isWin && nextTries.length >= maxChallenges;

  return stateSolutions.solution.map((solution, index) => ({
    curRow: row,
    curTry: currentTry,
    invalids,
    gameOver: shouldMarkGameOver,
    won: !isUnlimitedMode && isWin,
    tries: nextTries,
    solution,
    displaySolution: stateSolutions.displaySolution[index] ?? solution,
    definition: stateSolutions.definitions?.[index] ?? null,
    curday: stateSolutions.solutionIndex,
  }));
};
