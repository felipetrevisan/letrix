create or replace function letrix.is_multiplayer_room_member(target_room_id uuid)
returns boolean
language sql
security definer
set search_path = letrix, public
set row_security = off
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
