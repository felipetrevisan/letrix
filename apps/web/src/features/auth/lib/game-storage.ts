import type { GameLanguage, GameState, GameStats } from "@/interfaces/game";
import { getLetrixBrowserClient } from "@/features/auth/lib/supabase-client";

type CloudStatsRow = {
  stats: GameStats;
};

type CloudStateRow = {
  state: GameState[];
};

type DailyLeaderboardRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  attempts_used: number;
  max_attempts: number;
  solved_boards: number;
  total_boards: number;
  is_win: boolean;
  updated_at: string;
};

export type DailyLeaderboardEntry = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  attemptsUsed: number;
  maxAttempts: number;
  solvedBoards: number;
  totalBoards: number;
  isWin: boolean;
  updatedAt: string;
};

export type SaveDailyLeaderboardEntryInput = {
  userId: string;
  language: GameLanguage;
  modeName: string;
  puzzleDate: string;
  attemptsUsed: number;
  maxAttempts: number;
  solvedBoards: number;
  totalBoards: number;
  isWin: boolean;
  displayName: string;
  avatarUrl: string | null;
};

export const loadGameStateFromCloud = async (
  userId: string,
  language: GameLanguage,
  modeName: string,
  puzzleDate: string,
): Promise<GameState[]> => {
  const supabase = getLetrixBrowserClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("user_game_states")
    .select("state")
    .eq("user_id", userId)
    .eq("language", language)
    .eq("mode_name", modeName)
    .eq("puzzle_date", puzzleDate)
    .maybeSingle();

  const row = data as CloudStateRow | null;

  if (error || !row?.state?.length) {
    return [];
  }

  return row.state;
};

export const saveGameStateToCloud = async (
  userId: string,
  language: GameLanguage,
  modeName: string,
  puzzleDate: string,
  state: GameState[],
) => {
  const supabase = getLetrixBrowserClient();

  if (!supabase) {
    return;
  }

  await (supabase.from("user_game_states") as any).upsert(
    {
      user_id: userId,
      language,
      mode_name: modeName,
      puzzle_date: puzzleDate,
      state,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,language,mode_name,puzzle_date",
    },
  );
};

export const loadStatsFromCloud = async (
  userId: string,
  language: GameLanguage,
  modeName: string,
): Promise<GameStats | null> => {
  const supabase = getLetrixBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_mode_stats")
    .select("stats")
    .eq("user_id", userId)
    .eq("language", language)
    .eq("mode_name", modeName)
    .maybeSingle();

  const row = data as CloudStatsRow | null;

  if (error || !row?.stats) {
    return null;
  }

  return row.stats;
};

export const saveStatsToCloud = async (
  userId: string,
  language: GameLanguage,
  modeName: string,
  stats: GameStats,
) => {
  const supabase = getLetrixBrowserClient();

  if (!supabase) {
    return;
  }

  await (supabase.from("user_mode_stats") as any).upsert(
    {
      user_id: userId,
      language,
      mode_name: modeName,
      stats,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,language,mode_name",
    },
  );
};

export const loadDailyLeaderboard = async ({
  language,
  modeName,
  puzzleDate,
  limit = 10,
}: {
  language: GameLanguage;
  modeName: string;
  puzzleDate: string;
  limit?: number;
}): Promise<DailyLeaderboardEntry[]> => {
  const supabase = getLetrixBrowserClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("daily_leaderboard")
    .select(
      "user_id, display_name, avatar_url, attempts_used, max_attempts, solved_boards, total_boards, is_win, updated_at",
    )
    .eq("language", language)
    .eq("mode_name", modeName)
    .eq("puzzle_date", puzzleDate)
    .eq("is_win", true)
    .order("attempts_used", { ascending: true })
    .order("updated_at", { ascending: true })
    .limit(limit);

  const rows = data as DailyLeaderboardRow[] | null;

  if (error || !rows?.length) {
    return [];
  }

  return rows.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    attemptsUsed: row.attempts_used,
    maxAttempts: row.max_attempts,
    solvedBoards: row.solved_boards,
    totalBoards: row.total_boards,
    isWin: row.is_win,
    updatedAt: row.updated_at,
  }));
};

export const saveDailyLeaderboardEntry = async ({
  userId,
  language,
  modeName,
  puzzleDate,
  attemptsUsed,
  maxAttempts,
  solvedBoards,
  totalBoards,
  isWin,
  displayName,
  avatarUrl,
}: SaveDailyLeaderboardEntryInput) => {
  const supabase = getLetrixBrowserClient();

  if (!supabase) {
    return;
  }

  await (supabase.from("daily_leaderboard") as any).upsert(
    {
      user_id: userId,
      language,
      mode_name: modeName,
      puzzle_date: puzzleDate,
      attempts_used: attemptsUsed,
      max_attempts: maxAttempts,
      solved_boards: solvedBoards,
      total_boards: totalBoards,
      is_win: isWin,
      display_name: displayName,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id,language,mode_name,puzzle_date",
    },
  );
};
