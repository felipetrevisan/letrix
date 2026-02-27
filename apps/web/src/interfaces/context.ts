import { Dispatch, ReactNode, SetStateAction } from "react";
import {
  GameMode,
  GameStats,
  Guess,
  Solution,
  Config,
  GuessStatus,
  GameSettings,
  Game,
} from "./game";
import type { User } from "@supabase/supabase-js";

type OAuthProvider = "google" | "discord";

export interface ContextProps {
  children: ReactNode;
}

export type AppContextValue = {
  storage: Config | null;
  isInfoModalOpen: boolean;
  isStatsModalOpen: boolean;
  isSettingsModalOpen: boolean;
  isMenuOpen: boolean;
  isSidebarExpanded: boolean;
  isLoading: boolean;
  user: User | null;
  isAuthReady: boolean;
  setIsInfoModalOpen: (status: boolean) => void;
  setIsStatsModalOpen: (status: boolean) => void;
  setIsSettingsModalOpen: (status: boolean) => void;
  saveConfig: (data: Config) => void;
  signInWithMagicLink: (email: string) => Promise<{ error?: string }>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  toggleMenu: () => void;
  openMenu: () => void;
  closeMenu: () => void;
  toggleSidebar: () => void;
  loading: () => void;
  getConfig: (gameMode: GameMode) => Game;
};

export type GameContextValue = {
  gameMode: GameMode;
  solutions: Solution;
  currentRow: number;
  currentGuess: Guess;
  guesses: Guess[];
  invalidGuesses: string[];
  stats: GameStats;
  selectedTileIndex: number;
  selectedRowIndex: number;
  changeGameMode: (type: GameMode) => void;
  clearGuesses: () => void;
  resetCurrentGuess: () => void;
  setCurrentGuess: Dispatch<SetStateAction<Guess>>;
  setGuesses: Dispatch<SetStateAction<Guess[]>>;
  setSolutions: Dispatch<SetStateAction<Solution>>;
  setInvalidGuesses: Dispatch<SetStateAction<string[]>>;
  setSelectedTileIndex: Dispatch<SetStateAction<number>>;
  setSelectedRowIndex: Dispatch<SetStateAction<number>>;
  setCurrentRow: Dispatch<SetStateAction<number>>;
  setStats: Dispatch<SetStateAction<GameStats>>;
  updateGameFromSave: (guesses: string[]) => void;
  updateGuessStatus: (
    currentRow: number,
    status: keyof typeof GuessStatus,
  ) => void;
  saveGuess: () => void;
  onTyping: (
    value: string,
    currentSolution: string,
    maxChallenges: number,
    isGameWon: boolean,
  ) => void;
  onDelete: () => void;
  getMaxChallenges: () => number;
  getName: () => string;
  isTerm: () => boolean;
  isDuo: () => boolean;
  isTrio: () => boolean;
  isFour: () => boolean;
  isInfinite: () => boolean;
};
