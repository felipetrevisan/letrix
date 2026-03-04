create table if not exists letrix.multiplayer_rooms (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  language text not null check (language in ('pt', 'en')),
  target_wins smallint not null default 3 check (target_wins between 1 and 20),
  max_attempts smallint not null default 6 check (max_attempts between 1 and 12),
  word_length smallint not null default 5 check (word_length = 5),
  status text not null default 'waiting' check (status in ('waiting', 'active', 'finished')),
  current_round integer not null default 1 check (current_round >= 1),
  current_solution_normalized text not null,
  current_solution_display text not null,
  used_solutions jsonb not null default '[]'::jsonb,
  winner_id uuid references auth.users(id) on delete set null,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists letrix.multiplayer_room_players (
  room_id uuid not null references letrix.multiplayer_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  slot smallint not null check (slot between 1 and 2),
  display_name text not null,
  avatar_url text,
  score smallint not null default 0 check (score >= 0),
  solved_current_round boolean not null default false,
  attempts_used_current_round smallint not null default 0 check (attempts_used_current_round >= 0),
  masked_attempts jsonb not null default '[]'::jsonb,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id),
  unique (room_id, slot)
);

create table if not exists letrix.multiplayer_room_private_states (
  room_id uuid not null references letrix.multiplayer_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempts jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists multiplayer_rooms_status_idx
  on letrix.multiplayer_rooms (status, updated_at desc);

create index if not exists multiplayer_rooms_room_code_idx
  on letrix.multiplayer_rooms (room_code);

create index if not exists multiplayer_room_players_user_idx
  on letrix.multiplayer_room_players (user_id, updated_at desc);

grant select on table letrix.multiplayer_rooms to authenticated;
grant select on table letrix.multiplayer_room_players to authenticated;
grant select on table letrix.multiplayer_room_private_states to authenticated;

alter table letrix.multiplayer_rooms enable row level security;
alter table letrix.multiplayer_room_players enable row level security;
alter table letrix.multiplayer_room_private_states enable row level security;

drop policy if exists "multiplayer_rooms_select_member" on letrix.multiplayer_rooms;
create policy "multiplayer_rooms_select_member"
  on letrix.multiplayer_rooms
  for select
  using (
    exists (
      select 1
      from letrix.multiplayer_room_players players
      where players.room_id = id
        and players.user_id = auth.uid()
    )
  );

drop policy if exists "multiplayer_room_players_select_member" on letrix.multiplayer_room_players;
create policy "multiplayer_room_players_select_member"
  on letrix.multiplayer_room_players
  for select
  using (
    exists (
      select 1
      from letrix.multiplayer_room_players players
      where players.room_id = multiplayer_room_players.room_id
        and players.user_id = auth.uid()
    )
  );

drop policy if exists "multiplayer_room_private_states_select_own" on letrix.multiplayer_room_private_states;
create policy "multiplayer_room_private_states_select_own"
  on letrix.multiplayer_room_private_states
  for select
  using (auth.uid() = user_id);

do $$
begin
  alter publication supabase_realtime add table letrix.multiplayer_rooms;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table letrix.multiplayer_room_players;
exception
  when duplicate_object then null;
end $$;
