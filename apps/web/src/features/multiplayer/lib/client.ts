"use client";

import { getSupabaseBrowserClient } from "@/features/auth/lib/supabase-client";
import type { MultiplayerRoomSnapshot } from "@/features/multiplayer/lib/types";

const getAccessToken = async () => {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    throw new Error("Faça login para jogar online.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Faça login para jogar online.");
  }

  return session.access_token;
};

const apiRequest = async <T>(input: string, init?: RequestInit): Promise<T> => {
  const accessToken = await getAccessToken();
  const response = await fetch(input, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
  } & T;

  if (!response.ok) {
    throw new Error(payload.error ?? "A operação falhou.");
  }

  return payload;
};

export const createMultiplayerRoomRequest = async ({
  locale,
  targetWins,
}: {
  locale: string;
  targetWins: number;
}) => {
  const payload = await apiRequest<{ roomCode: string }>(
    "/api/multiplayer/create",
    {
      method: "POST",
      body: JSON.stringify({ locale, targetWins }),
    },
  );

  return payload.roomCode;
};

export const joinMultiplayerRoomRequest = async (roomCode: string) => {
  const payload = await apiRequest<{ roomCode: string }>(
    "/api/multiplayer/join",
    {
      method: "POST",
      body: JSON.stringify({ roomCode }),
    },
  );

  return payload.roomCode;
};

export const loadMultiplayerRoomRequest = async (roomCode: string) => {
  const payload = await apiRequest<{ snapshot: MultiplayerRoomSnapshot }>(
    `/api/multiplayer/room/${roomCode}`,
  );

  return payload.snapshot;
};

export const submitMultiplayerGuessRequest = async ({
  roomCode,
  guess,
}: {
  roomCode: string;
  guess: string;
}) => {
  const payload = await apiRequest<{
    snapshot: MultiplayerRoomSnapshot | null;
  }>("/api/multiplayer/submit", {
    method: "POST",
    body: JSON.stringify({ roomCode, guess }),
  });

  return payload.snapshot;
};

export const requestMultiplayerRematchRequest = async (roomCode: string) => {
  const payload = await apiRequest<{
    snapshot: MultiplayerRoomSnapshot | null;
  }>("/api/multiplayer/rematch", {
    method: "POST",
    body: JSON.stringify({ roomCode }),
  });

  return payload.snapshot;
};
