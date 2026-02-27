export enum GameMode {
  term = 1,
  duo = 2,
  trio = 3,
  four = 4,
  deca = 5,
  infinite = 6,
}

export type GameLanguage = "pt" | "en";

export type GameSettings = {
  [key: number]: Game;
};

export type Game = {
  maxChallenges: number;
  name: string;
  boards: number;
  wordLength: number;
};

export enum Animation {
  invalid,
  happy,
  revealing,
}

export type GameStats = {
  histo: number[];
  curstreak: number;
  maxstreak: number;
  perfectWins: number;
  currentPerfectStreak: number;
  bestPerfectStreak: number;
  games: number;
  wins: number;
  failed: number;
};

export type GameState = {
  curday: number;
  curRow: number;
  curTry: string;
  tries: string[];
  invalids: string[];
  solution: string;
  displaySolution?: string;
  gameOver: boolean;
  won: boolean;
};

export type GameStored = {
  meta: {};
  config: Config;
  state: GameState[];
  stats: GameStats;
};

// export type Storage = {
//   config: Config;
// };

export type Config = {
  hardMode?: boolean;
  highContrast?: boolean;
};

export type Guess = {
  row: number;
  word: string;
  letters: string[];
  status: keyof typeof GuessStatus;
  guessedRow: number | null;
};

export enum GuessStatus {
  initial,
  done,
  failed,
  complete,
}

export type Solution = {
  solutionIndex: number;
  solutionDate: Date;
  tomorrow: number;
  solution: string[];
  displaySolution: string[];
  language: GameLanguage;
};
