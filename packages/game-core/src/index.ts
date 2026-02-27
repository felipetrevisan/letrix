export type CoreGameMode = 1 | 2 | 3 | 4 | 5 | 6;

export type CoreModeConfig = {
  mode: CoreGameMode;
  name: "term" | "duo" | "trio" | "four" | "deca" | "infinite";
  maxChallenges: number;
  boards: number;
  wordLength: number;
};

export const coreModeConfigs: Record<CoreGameMode, CoreModeConfig> = {
  1: { mode: 1, name: "term", maxChallenges: 6, boards: 1, wordLength: 5 },
  2: { mode: 2, name: "duo", maxChallenges: 7, boards: 2, wordLength: 5 },
  3: { mode: 3, name: "trio", maxChallenges: 8, boards: 3, wordLength: 5 },
  4: { mode: 4, name: "four", maxChallenges: 9, boards: 4, wordLength: 5 },
  5: { mode: 5, name: "deca", maxChallenges: 8, boards: 1, wordLength: 10 },
  6: { mode: 6, name: "infinite", maxChallenges: 8, boards: 1, wordLength: 5 },
};

export const parseCoreGameMode = (
  value: string | number,
): CoreGameMode | null => {
  const mode = Number(value);

  if (
    mode === 1 ||
    mode === 2 ||
    mode === 3 ||
    mode === 4 ||
    mode === 5 ||
    mode === 6
  ) {
    return mode;
  }

  return null;
};

export const hasSolvedAllBoards = (solutions: string[], tries: string[]) => {
  return solutions.every((solution) => tries.includes(solution));
};
