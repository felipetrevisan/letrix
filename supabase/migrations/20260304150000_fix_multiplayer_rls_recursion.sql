create or replace function letrix.is_multiplayer_room_member(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = letrix, public
as $$
  select exists (
    select 1
    from letrix.multiplayer_room_players
    where room_id = target_room_id
      and user_id = auth.uid()
  );
$$;

revoke all on function letrix.is_multiplayer_room_member(uuid) from public;
grant execute on function letrix.is_multiplayer_room_member(uuid) to authenticated, service_role;

drop policy if exists "multiplayer_rooms_select_member" on letrix.multiplayer_rooms;
create policy "multiplayer_rooms_select_member"
  on letrix.multiplayer_rooms
  for select
  using (letrix.is_multiplayer_room_member(id));

drop policy if exists "multiplayer_room_players_select_member" on letrix.multiplayer_room_players;
create policy "multiplayer_room_players_select_member"
  on letrix.multiplayer_room_players
  for select
  using (letrix.is_multiplayer_room_member(room_id));
