create table if not exists letrix.daily_leaderboard (
  user_id uuid not null references auth.users(id) on delete cascade,
  puzzle_date date not null,
  language text not null check (language in ('pt', 'en')),
  mode_name text not null,
  attempts_used smallint not null check (attempts_used >= 0),
  max_attempts smallint not null check (max_attempts > 0),
  solved_boards smallint not null check (solved_boards >= 0),
  total_boards smallint not null check (total_boards > 0),
  is_win boolean not null default false,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, language, mode_name, puzzle_date)
);

create index if not exists daily_leaderboard_lookup_idx
  on letrix.daily_leaderboard (
    puzzle_date,
    language,
    mode_name,
    is_win,
    attempts_used,
    updated_at
  );

grant select on table letrix.daily_leaderboard to anon, authenticated;
grant select, insert, update, delete on table letrix.daily_leaderboard to authenticated;

alter table letrix.daily_leaderboard enable row level security;

drop policy if exists "daily_leaderboard_read" on letrix.daily_leaderboard;
create policy "daily_leaderboard_read"
  on letrix.daily_leaderboard
  for select
  using (true);

drop policy if exists "daily_leaderboard_upsert_own" on letrix.daily_leaderboard;
create policy "daily_leaderboard_upsert_own"
  on letrix.daily_leaderboard
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
