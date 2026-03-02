export type CoreGameMode = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type CoreModeConfig = {
  mode: CoreGameMode;
  name:
    | "term"
    | "duo"
    | "trio"
    | "four"
    | "quint"
    | "infinite"
    | "practice"
    | "sext";
  maxChallenges: number;
  boards: number;
  wordLength: number;
};

export const coreModeConfigs: Record<CoreGameMode, CoreModeConfig> = {
  1: { mode: 1, name: "term", maxChallenges: 6, boards: 1, wordLength: 5 },
  2: { mode: 2, name: "duo", maxChallenges: 7, boards: 2, wordLength: 5 },
  3: { mode: 3, name: "trio", maxChallenges: 8, boards: 3, wordLength: 5 },
  4: { mode: 4, name: "four", maxChallenges: 9, boards: 4, wordLength: 5 },
  5: { mode: 5, name: "quint", maxChallenges: 10, boards: 5, wordLength: 5 },
  6: { mode: 6, name: "infinite", maxChallenges: 8, boards: 1, wordLength: 5 },
  7: { mode: 7, name: "practice", maxChallenges: 6, boards: 1, wordLength: 5 },
  8: { mode: 8, name: "sext", maxChallenges: 11, boards: 6, wordLength: 5 },
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
    mode === 6 ||
    mode === 7 ||
    mode === 8
  ) {
    return mode;
  }

  return null;
};

export const hasSolvedAllBoards = (solutions: string[], tries: string[]) => {
  return solutions.every((solution) => tries.includes(solution));
};
