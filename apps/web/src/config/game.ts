import { Config, GameSettings, GameStats, Guess } from "@/interfaces/game";
import { coreModeConfigs } from "@letrix/game-core";

export const gameSettings = {
  1: {
    maxChallenges: coreModeConfigs[1].maxChallenges,
    name: coreModeConfigs[1].name,
    boards: coreModeConfigs[1].boards,
    wordLength: coreModeConfigs[1].wordLength,
  },
  2: {
    maxChallenges: coreModeConfigs[2].maxChallenges,
    name: coreModeConfigs[2].name,
    boards: coreModeConfigs[2].boards,
    wordLength: coreModeConfigs[2].wordLength,
  },
  3: {
    maxChallenges: coreModeConfigs[3].maxChallenges,
    name: coreModeConfigs[3].name,
    boards: coreModeConfigs[3].boards,
    wordLength: coreModeConfigs[3].wordLength,
  },
  4: {
    maxChallenges: coreModeConfigs[4].maxChallenges,
    name: coreModeConfigs[4].name,
    boards: coreModeConfigs[4].boards,
    wordLength: coreModeConfigs[4].wordLength,
  },
  5: {
    maxChallenges: coreModeConfigs[5].maxChallenges,
    name: coreModeConfigs[5].name,
    boards: coreModeConfigs[5].boards,
    wordLength: coreModeConfigs[5].wordLength,
  },
  6: {
    maxChallenges: coreModeConfigs[6].maxChallenges,
    name: coreModeConfigs[6].name,
    boards: coreModeConfigs[6].boards,
    wordLength: coreModeConfigs[6].wordLength,
  },
} satisfies GameSettings;

export const initialConfig = {
  hardMode: false,
  highContrast: false,
} satisfies Config;

export const initialStats = {
  histo: [0, 0, 0, 0, 0, 0],
  curstreak: 0,
  maxstreak: 0,
  perfectWins: 0,
  currentPerfectStreak: 0,
  bestPerfectStreak: 0,
  games: 0,
  wins: 0,
  failed: 0,
} satisfies GameStats;

export const initialGuess = {
  row: 0,
  word: "",
  letters: [],
  status: "initial",
  guessedRow: null,
} satisfies Guess;
