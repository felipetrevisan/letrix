-- Letrix Supabase schema
-- Run in Supabase SQL editor

create extension if not exists pgcrypto;
create schema if not exists letrix;

grant usage on schema letrix to anon, authenticated, service_role;
grant all privileges on all tables in schema letrix to service_role;
grant all privileges on all sequences in schema letrix to service_role;
alter default privileges in schema letrix grant all privileges on tables to service_role;
alter default privileges in schema letrix grant all privileges on sequences to service_role;

create table if not exists letrix.words (
  id uuid primary key default gen_random_uuid(),
  language text not null check (language in ('pt', 'en')),
  normalized_word text not null,
  display_word text not null,
  definition text,
  definition_source text,
  definition_status text default 'pending',
  definition_model text,
  definition_generated_at timestamptz,
  definition_updated_at timestamptz,
  word_length smallint not null check (word_length between 2 and 32),
  is_solution boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(language, normalized_word)
);

alter table if exists letrix.words
  add column if not exists definition text;

alter table if exists letrix.words
  add column if not exists definition_source text,
  add column if not exists definition_status text,
  add column if not exists definition_model text,
  add column if not exists definition_generated_at timestamptz,
  add column if not exists definition_updated_at timestamptz;

create index if not exists words_language_length_idx
  on letrix.words (language, word_length);

create index if not exists words_definition_status_idx
  on letrix.words (definition_status);

create index if not exists words_definition_lookup_idx
  on letrix.words (language, normalized_word, definition_status);

create table if not exists letrix.daily_puzzles (
  id bigserial primary key,
  puzzle_date date not null,
  language text not null check (language in ('pt', 'en')),
  mode smallint not null check (mode between 1 and 5),
  board_index smallint not null check (board_index between 0 and 7),
  solution_normalized text not null,
  solution_display text not null,
  created_at timestamptz not null default now(),
  unique(puzzle_date, language, mode, board_index)
);

create index if not exists daily_puzzles_lookup_idx
  on letrix.daily_puzzles (puzzle_date, language, mode, board_index);

create table if not exists letrix.user_mode_stats (
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null check (language in ('pt', 'en')),
  mode_name text not null,
  stats jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, language, mode_name)
);

create table if not exists letrix.user_game_states (
  user_id uuid not null references auth.users(id) on delete cascade,
  language text not null check (language in ('pt', 'en')),
  mode_name text not null,
  puzzle_date date not null,
  state jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, language, mode_name, puzzle_date)
);

grant select on table letrix.words, letrix.daily_puzzles to anon, authenticated;
grant select, insert, update, delete on table letrix.user_mode_stats, letrix.user_game_states to authenticated;

alter table letrix.words enable row level security;
alter table letrix.daily_puzzles enable row level security;
alter table letrix.user_mode_stats enable row level security;
alter table letrix.user_game_states enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'words_definition_source_check'
      and conrelid = 'letrix.words'::regclass
  ) then
    alter table letrix.words
      add constraint words_definition_source_check
      check (
        definition_source is null
        or definition_source in ('ai', 'manual')
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'words_definition_status_check'
      and conrelid = 'letrix.words'::regclass
  ) then
    alter table letrix.words
      add constraint words_definition_status_check
      check (
        definition_status is null
        or definition_status in ('pending', 'ready', 'failed')
      );
  end if;
end
$$;

-- Public read-only access to dictionary and daily puzzles
drop policy if exists "words_read_active" on letrix.words;
create policy "words_read_active"
  on letrix.words
  for select
  using (is_active = true);

drop policy if exists "daily_puzzles_read" on letrix.daily_puzzles;
create policy "daily_puzzles_read"
  on letrix.daily_puzzles
  for select
  using (true);

-- User-owned access
drop policy if exists "user_mode_stats_select_own" on letrix.user_mode_stats;
create policy "user_mode_stats_select_own"
  on letrix.user_mode_stats
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_mode_stats_upsert_own" on letrix.user_mode_stats;
create policy "user_mode_stats_upsert_own"
  on letrix.user_mode_stats
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_game_states_select_own" on letrix.user_game_states;
create policy "user_game_states_select_own"
  on letrix.user_game_states
  for select
  using (auth.uid() = user_id);

drop policy if exists "user_game_states_upsert_own" on letrix.user_game_states;
create policy "user_game_states_upsert_own"
  on letrix.user_game_states
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
