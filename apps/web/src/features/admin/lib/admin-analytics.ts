import type { User } from "@supabase/supabase-js";
import {
  getLetrixServerClient,
  getSupabaseServerClient,
} from "@/features/auth/lib/supabase-server";

type UserModeStatsRow = {
  user_id: string;
  mode_name: string;
  stats: {
    games?: number;
    wins?: number;
    failed?: number;
    perfectWins?: number;
    maxstreak?: number;
  } | null;
  updated_at: string;
};

type UserGameStateRow = {
  user_id: string;
  mode_name: string;
  updated_at: string;
};

type DailyLeaderboardRow = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  updated_at: string;
};

export type AdminOverviewMetric = {
  totalPlayers: number;
  activePlayers24h: number;
  activePlayers7d: number;
  recordedGames: number;
  recordedWins: number;
};

export type AdminModeUsage = {
  modeName: string;
  modeLabel: string;
  players: number;
  activePlayers24h: number;
  games: number;
  wins: number;
  failed: number;
  winRate: number;
  lastPlayedAt: string | null;
};

export type AdminRankingEntry = {
  rank: number;
  userId: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  games: number;
  wins: number;
  failed: number;
  perfectWins: number;
  maxStreak: number;
  winRate: number;
  lastSeenAt: string | null;
};

export type AdminDashboardData = {
  generatedAt: string;
  overview: AdminOverviewMetric;
  modeUsage: AdminModeUsage[];
  ranking: AdminRankingEntry[];
};

const MODE_LABELS: Record<string, string> = {
  term: "Termo",
  duo: "Dueto",
  trio: "Trieto",
  four: "Quarteto",
  quint: "Quinteto",
  sext: "Sexteto",
  infinite: "Infinito",
  practice: "Prática",
};

const getModeLabel = (modeName: string) => {
  return MODE_LABELS[modeName] ?? modeName;
};

const getUserMetadataString = (user: User | null | undefined, key: string) => {
  const value = user?.user_metadata?.[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
};

const getUserDisplayName = (user: User | null | undefined) => {
  const metadataName =
    getUserMetadataString(user, "full_name") ??
    getUserMetadataString(user, "name") ??
    getUserMetadataString(user, "user_name") ??
    getUserMetadataString(user, "preferred_username");

  const email = user?.email?.trim();

  if (metadataName) {
    return metadataName;
  }

  if (!email) {
    return "Jogador";
  }

  return email.split("@")[0]?.trim() || email;
};

const getUserAvatarUrl = (user: User | null | undefined) => {
  return (
    getUserMetadataString(user, "avatar_url") ??
    getUserMetadataString(user, "picture")
  );
};

const calculateWinRate = (wins: number, games: number) => {
  if (!games) {
    return 0;
  }

  return Math.round((wins / games) * 1000) / 10;
};

const fetchAllRows = async <TRow>(
  buildQuery: (from: number, to: number) => any,
): Promise<TRow[]> => {
  const pageSize = 1000;
  const rows: TRow[] = [];

  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery(from, to);

    if (error) {
      throw error;
    }

    const batch = (data as TRow[] | null) ?? [];
    rows.push(...batch);

    if (batch.length < pageSize) {
      break;
    }
  }

  return rows;
};

const fetchAllUsers = async () => {
  const supabase = getSupabaseServerClient();

  if (!supabase) {
    return [];
  }

  const users: User[] = [];

  for (let page = 1; ; page += 1) {
    try {
      const { data, error } = await supabase.auth.admin.listUsers({
        page,
        perPage: 1000,
      });

      if (error) {
        throw error;
      }

      const batch = data.users ?? [];
      users.push(...batch);

      if (batch.length < 1000) {
        break;
      }
    } catch (error) {
      console.error("[admin] failed to list auth users", error);
      break;
    }
  }

  return users;
};

export const getAdminDashboardData = async (): Promise<AdminDashboardData> => {
  const supabase = getLetrixServerClient();

  if (!supabase) {
    throw new Error("Painel administrativo indisponível no momento.");
  }

  const now = Date.now();
  const iso24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const iso7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    statsRows,
    recentStateRows24h,
    recentStateRows7d,
    leaderboardRows,
    users,
  ] = await Promise.all([
    fetchAllRows<UserModeStatsRow>((from, to) =>
      supabase
        .from("user_mode_stats")
        .select("user_id, mode_name, stats, updated_at")
        .order("updated_at", { ascending: false })
        .range(from, to),
    ),
    fetchAllRows<UserGameStateRow>((from, to) =>
      supabase
        .from("user_game_states")
        .select("user_id, mode_name, updated_at")
        .gte("updated_at", iso24h)
        .order("updated_at", { ascending: false })
        .range(from, to),
    ),
    fetchAllRows<UserGameStateRow>((from, to) =>
      supabase
        .from("user_game_states")
        .select("user_id, mode_name, updated_at")
        .gte("updated_at", iso7d)
        .order("updated_at", { ascending: false })
        .range(from, to),
    ),
    fetchAllRows<DailyLeaderboardRow>((from, to) =>
      supabase
        .from("daily_leaderboard")
        .select("user_id, display_name, avatar_url, updated_at")
        .order("updated_at", { ascending: false })
        .range(from, to),
    ),
    fetchAllUsers(),
  ]);

  const authUserMap = new Map(users.map((user) => [user.id, user]));
  const leaderboardIdentityMap = new Map<
    string,
    { displayName: string; avatarUrl: string | null; updatedAt: string }
  >();

  for (const row of leaderboardRows) {
    if (!leaderboardIdentityMap.has(row.user_id)) {
      leaderboardIdentityMap.set(row.user_id, {
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        updatedAt: row.updated_at,
      });
    }
  }

  const recentPlayers24h = new Set(
    recentStateRows24h.map((row) => row.user_id),
  );
  const recentPlayers7d = new Set(recentStateRows7d.map((row) => row.user_id));
  const playersByMode24h = new Map<string, Set<string>>();

  for (const row of recentStateRows24h) {
    const existing = playersByMode24h.get(row.mode_name) ?? new Set<string>();
    existing.add(row.user_id);
    playersByMode24h.set(row.mode_name, existing);
  }

  const modeUsageMap = new Map<
    string,
    {
      players: Set<string>;
      games: number;
      wins: number;
      failed: number;
      lastPlayedAt: string | null;
    }
  >();

  const rankingMap = new Map<
    string,
    {
      userId: string;
      games: number;
      wins: number;
      failed: number;
      perfectWins: number;
      maxStreak: number;
      lastSeenAt: string | null;
    }
  >();

  let recordedGames = 0;
  let recordedWins = 0;

  for (const row of statsRows) {
    const stats = row.stats ?? {};
    const games = Number(stats.games ?? 0);
    const wins = Number(stats.wins ?? 0);
    const failed = Number(stats.failed ?? 0);
    const perfectWins = Number(stats.perfectWins ?? 0);
    const maxStreak = Number(stats.maxstreak ?? 0);

    recordedGames += games;
    recordedWins += wins;

    const modeEntry = modeUsageMap.get(row.mode_name) ?? {
      players: new Set<string>(),
      games: 0,
      wins: 0,
      failed: 0,
      lastPlayedAt: null,
    };
    modeEntry.players.add(row.user_id);
    modeEntry.games += games;
    modeEntry.wins += wins;
    modeEntry.failed += failed;
    if (
      !modeEntry.lastPlayedAt ||
      new Date(row.updated_at).getTime() >
        new Date(modeEntry.lastPlayedAt).getTime()
    ) {
      modeEntry.lastPlayedAt = row.updated_at;
    }
    modeUsageMap.set(row.mode_name, modeEntry);

    const rankingEntry = rankingMap.get(row.user_id) ?? {
      userId: row.user_id,
      games: 0,
      wins: 0,
      failed: 0,
      perfectWins: 0,
      maxStreak: 0,
      lastSeenAt: null,
    };
    rankingEntry.games += games;
    rankingEntry.wins += wins;
    rankingEntry.failed += failed;
    rankingEntry.perfectWins += perfectWins;
    rankingEntry.maxStreak = Math.max(rankingEntry.maxStreak, maxStreak);
    if (
      !rankingEntry.lastSeenAt ||
      new Date(row.updated_at).getTime() >
        new Date(rankingEntry.lastSeenAt).getTime()
    ) {
      rankingEntry.lastSeenAt = row.updated_at;
    }
    rankingMap.set(row.user_id, rankingEntry);
  }

  const modeUsage = Array.from(modeUsageMap.entries())
    .map(([modeName, entry]) => ({
      modeName,
      modeLabel: getModeLabel(modeName),
      players: entry.players.size,
      activePlayers24h: playersByMode24h.get(modeName)?.size ?? 0,
      games: entry.games,
      wins: entry.wins,
      failed: entry.failed,
      winRate: calculateWinRate(entry.wins, entry.games),
      lastPlayedAt: entry.lastPlayedAt,
    }))
    .sort((left, right) => {
      return (
        right.games - left.games ||
        right.players - left.players ||
        left.modeLabel.localeCompare(right.modeLabel, "pt-BR")
      );
    });

  const ranking = Array.from(rankingMap.values())
    .map((entry) => {
      const authUser = authUserMap.get(entry.userId);
      const leaderboardIdentity = leaderboardIdentityMap.get(entry.userId);

      return {
        rank: 0,
        userId: entry.userId,
        displayName:
          leaderboardIdentity?.displayName ?? getUserDisplayName(authUser),
        email: authUser?.email?.trim() ?? null,
        avatarUrl:
          leaderboardIdentity?.avatarUrl ?? getUserAvatarUrl(authUser) ?? null,
        games: entry.games,
        wins: entry.wins,
        failed: entry.failed,
        perfectWins: entry.perfectWins,
        maxStreak: entry.maxStreak,
        winRate: calculateWinRate(entry.wins, entry.games),
        lastSeenAt: entry.lastSeenAt,
      };
    })
    .filter((entry) => entry.games > 0)
    .sort((left, right) => {
      return (
        right.wins - left.wins ||
        right.winRate - left.winRate ||
        right.games - left.games ||
        right.maxStreak - left.maxStreak ||
        (right.lastSeenAt ? new Date(right.lastSeenAt).getTime() : 0) -
          (left.lastSeenAt ? new Date(left.lastSeenAt).getTime() : 0)
      );
    })
    .slice(0, 25)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return {
    generatedAt: new Date().toISOString(),
    overview: {
      totalPlayers: new Set(statsRows.map((row) => row.user_id)).size,
      activePlayers24h: recentPlayers24h.size,
      activePlayers7d: recentPlayers7d.size,
      recordedGames,
      recordedWins,
    },
    modeUsage,
    ranking,
  };
};
