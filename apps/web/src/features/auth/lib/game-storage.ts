import type { GameLanguage, GameState, GameStats } from "@/interfaces/game";
import { getLetrixBrowserClient } from "@/features/auth/lib/supabase-client";

type CloudStatsRow = {
  stats: GameStats;
};

type CloudStateRow = {
  state: GameState[];
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
