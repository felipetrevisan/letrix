import type { GameLanguage } from "@/interfaces/game";
import type { Status } from "@/lib/statuses";

export type MultiplayerRoomStatus = "waiting" | "active" | "finished";

export type MultiplayerMaskedAttempt = {
  statuses: Status[];
};

export type MultiplayerPrivateAttempt = {
  guess: string;
  statuses: Status[];
};

export type MultiplayerPlayerSnapshot = {
  userId: string;
  slot: number;
  displayName: string;
  avatarUrl: string | null;
  score: number;
  solvedCurrentRound: boolean;
  attemptsUsedCurrentRound: number;
  maskedAttempts: MultiplayerMaskedAttempt[];
  attempts: MultiplayerPrivateAttempt[];
};

export type MultiplayerRoomSnapshot = {
  roomId: string;
  roomCode: string;
  language: GameLanguage;
  targetWins: number;
  maxAttempts: number;
  wordLength: number;
  currentRound: number;
  status: MultiplayerRoomStatus;
  createdBy: string;
  winnerId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  roundStartsAt: string | null;
  rematchRequestedByMe: boolean;
  rematchRequestedByOpponent: boolean;
  me: MultiplayerPlayerSnapshot;
  opponent: MultiplayerPlayerSnapshot | null;
};

export type MultiplayerSubmitResult = {
  attempt: MultiplayerPrivateAttempt;
  solvedCurrentRound: boolean;
  score: number;
  roomStatus: MultiplayerRoomStatus;
  winnerId: string | null;
  roundStartsAt: string | null;
};
