import { randomBytes } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import {
  getSupabaseServerClient,
  getLetrixServerClient,
} from "@/features/auth/lib/supabase-server";
import {
  getUserAvatarUrl,
  getUserDisplayName,
} from "@/features/auth/lib/user-profile";
import type {
  MultiplayerMaskedAttempt,
  MultiplayerPlayerSnapshot,
  MultiplayerPrivateAttempt,
  MultiplayerRoomSnapshot,
} from "@/features/multiplayer/lib/types";
import type { GameLanguage } from "@/interfaces/game";
import { getGuessStatuses } from "@/lib/statuses";
import { normalizeWord, unicodeSplit } from "@/lib/words";

type MultiplayerRoomRow = {
  id: string;
  room_code: string;
  language: GameLanguage;
  target_wins: number;
  max_attempts: number;
  word_length: number;
  status: "waiting" | "active" | "finished";
  current_round: number;
  current_solution_normalized: string;
  current_solution_display: string;
  used_solutions: string[];
  created_by: string;
  winner_id: string | null;
  started_at: string | null;
  finished_at: string | null;
};

type MultiplayerRoomPlayerRow = {
  room_id: string;
  user_id: string;
  slot: number;
  display_name: string;
  avatar_url: string | null;
  score: number;
  solved_current_round: boolean;
  attempts_used_current_round: number;
  masked_attempts: MultiplayerMaskedAttempt[];
};

type MultiplayerRoomPrivateStateRow = {
  room_id: string;
  user_id: string;
  attempts: MultiplayerPrivateAttempt[];
};

const ROOM_CODE_LENGTH = 6;

const getAccessTokenFromRequest = (request: Request) => {
  const authorization = request.headers.get("authorization")?.trim();

  if (!authorization?.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  return authorization.slice(7).trim() || null;
};

export const getAuthorizedUserFromRequest = async (request: Request) => {
  const accessToken = getAccessTokenFromRequest(request);
  const supabase = getSupabaseServerClient();

  if (!accessToken || !supabase) {
    return { user: null, error: "Acesso não autorizado." as const };
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(accessToken);

  if (error || !user) {
    return { user: null, error: "Acesso não autorizado." as const };
  }

  return { user, error: null };
};

const getRandomRoomCode = () => {
  return randomBytes(ROOM_CODE_LENGTH)
    .toString("hex")
    .toUpperCase()
    .slice(0, ROOM_CODE_LENGTH);
};

const ensureServerClients = () => {
  const supabase = getSupabaseServerClient();
  const letrix = getLetrixServerClient();

  if (!supabase || !letrix) {
    throw new Error("server-unavailable");
  }

  return { supabase, letrix };
};

const pickRandomSolution = async (
  language: GameLanguage,
  exclude: string[] = [],
) => {
  const { letrix } = ensureServerClients();

  const { count } = await letrix
    .from("words")
    .select("id", { count: "exact", head: true })
    .eq("language", language)
    .eq("word_length", 5)
    .eq("is_solution", true)
    .eq("is_active", true);

  const total = count ?? 0;

  if (!total) {
    throw new Error("solution-pool-empty");
  }

  for (let attempt = 0; attempt < 25; attempt += 1) {
    const offset = Math.floor(Math.random() * total);
    const { data } = await letrix
      .from("words")
      .select("normalized_word, display_word")
      .eq("language", language)
      .eq("word_length", 5)
      .eq("is_solution", true)
      .eq("is_active", true)
      .order("normalized_word", { ascending: true })
      .range(offset, offset)
      .maybeSingle();

    if (!data) {
      continue;
    }

    const normalized = data.normalized_word as string;

    if (exclude.includes(normalized)) {
      continue;
    }

    return {
      normalized: normalized,
      display: (data.display_word as string) ?? normalized,
    };
  }

  const { data } = await letrix
    .from("words")
    .select("normalized_word, display_word")
    .eq("language", language)
    .eq("word_length", 5)
    .eq("is_solution", true)
    .eq("is_active", true)
    .not(
      "normalized_word",
      "in",
      `(${exclude.map((value) => `"${value}"`).join(",")})`,
    )
    .order("normalized_word", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) {
    throw new Error("solution-pool-empty");
  }

  return {
    normalized: data.normalized_word as string,
    display: (data.display_word as string) ?? (data.normalized_word as string),
  };
};

const mapPlayerSnapshot = (
  player: MultiplayerRoomPlayerRow,
  privateState?: MultiplayerRoomPrivateStateRow | null,
): MultiplayerPlayerSnapshot => {
  return {
    userId: player.user_id,
    slot: player.slot,
    displayName: player.display_name,
    avatarUrl: player.avatar_url,
    score: player.score,
    solvedCurrentRound: player.solved_current_round,
    attemptsUsedCurrentRound: player.attempts_used_current_round,
    maskedAttempts: Array.isArray(player.masked_attempts)
      ? player.masked_attempts
      : [],
    attempts:
      privateState && Array.isArray(privateState.attempts)
        ? privateState.attempts
        : [],
  };
};

const getRoomByCode = async (roomCode: string) => {
  const { letrix } = ensureServerClients();

  const { data } = await letrix
    .from("multiplayer_rooms")
    .select(
      "id, room_code, language, target_wins, max_attempts, word_length, status, current_round, current_solution_normalized, current_solution_display, used_solutions, created_by, winner_id, started_at, finished_at",
    )
    .eq("room_code", roomCode)
    .maybeSingle();

  return (data as MultiplayerRoomRow | null) ?? null;
};

const getRoomPlayers = async (roomId: string) => {
  const { letrix } = ensureServerClients();

  const { data } = await letrix
    .from("multiplayer_room_players")
    .select(
      "room_id, user_id, slot, display_name, avatar_url, score, solved_current_round, attempts_used_current_round, masked_attempts",
    )
    .eq("room_id", roomId)
    .order("slot", { ascending: true });

  return (data as MultiplayerRoomPlayerRow[] | null) ?? [];
};

const getPrivateState = async (roomId: string, userId: string) => {
  const { letrix } = ensureServerClients();

  const { data } = await letrix
    .from("multiplayer_room_private_states")
    .select("room_id, user_id, attempts")
    .eq("room_id", roomId)
    .eq("user_id", userId)
    .maybeSingle();

  return (data as MultiplayerRoomPrivateStateRow | null) ?? null;
};

export const getMultiplayerRoomSnapshot = async (
  roomCode: string,
  userId: string,
): Promise<MultiplayerRoomSnapshot | null> => {
  const room = await getRoomByCode(roomCode);

  if (!room) {
    return null;
  }

  const players = await getRoomPlayers(room.id);
  const me = players.find((player) => player.user_id === userId);

  if (!me) {
    return null;
  }

  const opponent = players.find((player) => player.user_id !== userId) ?? null;
  const myPrivateState = await getPrivateState(room.id, userId);

  return {
    roomId: room.id,
    roomCode: room.room_code,
    language: room.language,
    targetWins: room.target_wins,
    maxAttempts: room.max_attempts,
    wordLength: room.word_length,
    currentRound: room.current_round,
    status: room.status,
    createdBy: room.created_by,
    winnerId: room.winner_id,
    startedAt: room.started_at,
    finishedAt: room.finished_at,
    me: mapPlayerSnapshot(me, myPrivateState),
    opponent: opponent ? mapPlayerSnapshot(opponent) : null,
  };
};

export const createMultiplayerRoom = async ({
  user,
  language,
  targetWins,
}: {
  user: User;
  language: GameLanguage;
  targetWins: number;
}) => {
  const { letrix } = ensureServerClients();
  const firstWord = await pickRandomSolution(language);
  const roomCode = getRandomRoomCode();
  const now = new Date().toISOString();

  const roomPayload = {
    room_code: roomCode,
    created_by: user.id,
    language,
    target_wins: targetWins,
    max_attempts: 6,
    word_length: 5,
    status: "waiting",
    current_round: 1,
    current_solution_normalized: firstWord.normalized,
    current_solution_display: firstWord.display,
    used_solutions: [firstWord.normalized],
    updated_at: now,
  };

  const { data: roomData, error: roomError } = await (
    letrix.from("multiplayer_rooms") as any
  )
    .insert(roomPayload)
    .select("id, room_code")
    .single();

  if (roomError || !roomData) {
    throw new Error("room-create-failed");
  }

  const playerPayload = {
    room_id: roomData.id,
    user_id: user.id,
    slot: 1,
    display_name: getUserDisplayName(user),
    avatar_url: getUserAvatarUrl(user),
    score: 0,
    solved_current_round: false,
    attempts_used_current_round: 0,
    masked_attempts: [],
    updated_at: now,
  };

  await (letrix.from("multiplayer_room_players") as any).insert(playerPayload);
  await (letrix.from("multiplayer_room_private_states") as any).insert({
    room_id: roomData.id,
    user_id: user.id,
    attempts: [],
    updated_at: now,
  });

  return roomData.room_code as string;
};

export const joinMultiplayerRoom = async ({
  roomCode,
  user,
}: {
  roomCode: string;
  user: User;
}) => {
  const { letrix } = ensureServerClients();
  const room = await getRoomByCode(roomCode);

  if (!room) {
    throw new Error("room-not-found");
  }

  if (room.status === "finished") {
    throw new Error("room-finished");
  }

  const players = await getRoomPlayers(room.id);

  if (players.some((player) => player.user_id === user.id)) {
    return room.room_code;
  }

  if (players.length >= 2) {
    throw new Error("room-full");
  }

  const now = new Date().toISOString();

  await (letrix.from("multiplayer_room_players") as any).insert({
    room_id: room.id,
    user_id: user.id,
    slot: 2,
    display_name: getUserDisplayName(user),
    avatar_url: getUserAvatarUrl(user),
    score: 0,
    solved_current_round: false,
    attempts_used_current_round: 0,
    masked_attempts: [],
    updated_at: now,
  });

  await (letrix.from("multiplayer_room_private_states") as any).insert({
    room_id: room.id,
    user_id: user.id,
    attempts: [],
    updated_at: now,
  });

  await (letrix.from("multiplayer_rooms") as any)
    .update({
      status: "active",
      started_at: room.started_at ?? now,
      updated_at: now,
    })
    .eq("id", room.id)
    .eq("status", "waiting");

  return room.room_code;
};

const updatePlayerState = async ({
  roomId,
  userId,
  attempts,
  maskedAttempts,
  solvedCurrentRound,
}: {
  roomId: string;
  userId: string;
  attempts: MultiplayerPrivateAttempt[];
  maskedAttempts: MultiplayerMaskedAttempt[];
  solvedCurrentRound: boolean;
}) => {
  const { letrix } = ensureServerClients();
  const updatedAt = new Date().toISOString();

  await (letrix.from("multiplayer_room_private_states") as any)
    .update({
      attempts,
      updated_at: updatedAt,
    })
    .eq("room_id", roomId)
    .eq("user_id", userId);

  await (letrix.from("multiplayer_room_players") as any)
    .update({
      masked_attempts: maskedAttempts,
      solved_current_round: solvedCurrentRound,
      attempts_used_current_round: attempts.length,
      updated_at: updatedAt,
    })
    .eq("room_id", roomId)
    .eq("user_id", userId);
};

const resetRoundForAllPlayers = async (roomId: string) => {
  const { letrix } = ensureServerClients();
  const updatedAt = new Date().toISOString();

  await (letrix.from("multiplayer_room_players") as any)
    .update({
      masked_attempts: [],
      solved_current_round: false,
      attempts_used_current_round: 0,
      updated_at: updatedAt,
    })
    .eq("room_id", roomId);

  await (letrix.from("multiplayer_room_private_states") as any)
    .update({
      attempts: [],
      updated_at: updatedAt,
    })
    .eq("room_id", roomId);
};

const maybeAdvanceAfterMisses = async (room: MultiplayerRoomRow) => {
  const { letrix } = ensureServerClients();
  const players = await getRoomPlayers(room.id);

  if (
    players.length !== 2 ||
    players.some((player) => player.solved_current_round) ||
    players.some(
      (player) => player.attempts_used_current_round < room.max_attempts,
    )
  ) {
    return;
  }

  const nextWord = await pickRandomSolution(
    room.language,
    room.used_solutions ?? [],
  );
  const updatedAt = new Date().toISOString();

  const { data: advancedRoom } = await (letrix.from("multiplayer_rooms") as any)
    .update({
      current_round: room.current_round + 1,
      current_solution_normalized: nextWord.normalized,
      current_solution_display: nextWord.display,
      used_solutions: [...(room.used_solutions ?? []), nextWord.normalized],
      updated_at: updatedAt,
    })
    .eq("id", room.id)
    .eq("status", "active")
    .eq("current_round", room.current_round)
    .select("id")
    .maybeSingle();

  if (advancedRoom) {
    await resetRoundForAllPlayers(room.id);
  }
};

export const submitMultiplayerGuess = async ({
  roomCode,
  user,
  guess,
}: {
  roomCode: string;
  user: User;
  guess: string;
}) => {
  const { letrix } = ensureServerClients();
  const room = await getRoomByCode(roomCode);

  if (!room) {
    throw new Error("room-not-found");
  }

  if (room.status === "waiting") {
    throw new Error("room-waiting");
  }

  if (room.status === "finished") {
    throw new Error("room-finished");
  }

  const players = await getRoomPlayers(room.id);
  const me = players.find((player) => player.user_id === user.id);

  if (!me) {
    throw new Error("room-forbidden");
  }

  if (
    me.solved_current_round ||
    me.attempts_used_current_round >= room.max_attempts
  ) {
    throw new Error("round-locked");
  }

  const normalizedGuess = normalizeWord(guess);

  if (unicodeSplit(normalizedGuess).length !== room.word_length) {
    throw new Error("invalid-length");
  }

  const { count } = await letrix
    .from("words")
    .select("id", { count: "exact", head: true })
    .eq("language", room.language)
    .eq("word_length", room.word_length)
    .eq("normalized_word", normalizedGuess)
    .eq("is_active", true);

  if ((count ?? 0) === 0) {
    throw new Error("word-not-found");
  }

  const privateState = await getPrivateState(room.id, user.id);
  const statuses = getGuessStatuses(
    unicodeSplit(normalizedGuess),
    room.current_solution_normalized,
  );
  const nextAttempts = [
    ...((privateState?.attempts ?? []) as MultiplayerPrivateAttempt[]),
    {
      guess: guess.toLocaleUpperCase("pt-BR"),
      statuses,
    },
  ];
  const nextMaskedAttempts = [
    ...(me.masked_attempts ?? []),
    {
      statuses,
    },
  ];
  const solvedCurrentRound =
    normalizedGuess === room.current_solution_normalized;

  await updatePlayerState({
    roomId: room.id,
    userId: user.id,
    attempts: nextAttempts,
    maskedAttempts: nextMaskedAttempts,
    solvedCurrentRound,
  });

  if (solvedCurrentRound) {
    const updatedAt = new Date().toISOString();
    const nextScore = me.score + 1;

    await (letrix.from("multiplayer_room_players") as any)
      .update({
        score: nextScore,
        updated_at: updatedAt,
      })
      .eq("room_id", room.id)
      .eq("user_id", user.id);

    if (nextScore >= room.target_wins) {
      await (letrix.from("multiplayer_rooms") as any)
        .update({
          status: "finished",
          winner_id: user.id,
          finished_at: updatedAt,
          updated_at: updatedAt,
        })
        .eq("id", room.id)
        .eq("status", "active");

      return;
    }

    const nextWord = await pickRandomSolution(
      room.language,
      room.used_solutions ?? [],
    );

    const { data: advancedRoom } = await (
      letrix.from("multiplayer_rooms") as any
    )
      .update({
        current_round: room.current_round + 1,
        current_solution_normalized: nextWord.normalized,
        current_solution_display: nextWord.display,
        used_solutions: [...(room.used_solutions ?? []), nextWord.normalized],
        updated_at: updatedAt,
      })
      .eq("id", room.id)
      .eq("status", "active")
      .eq("current_round", room.current_round)
      .select("id")
      .maybeSingle();

    if (advancedRoom) {
      await resetRoundForAllPlayers(room.id);
    }

    return;
  }

  await maybeAdvanceAfterMisses(room);
};
