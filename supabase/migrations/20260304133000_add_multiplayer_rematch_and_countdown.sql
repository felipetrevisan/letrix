alter table letrix.multiplayer_rooms
add column if not exists round_starts_at timestamptz not null default now();

alter table letrix.multiplayer_rooms
add column if not exists rematch_requested_user_ids jsonb not null default '[]'::jsonb;
