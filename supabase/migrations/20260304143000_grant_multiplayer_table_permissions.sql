grant usage on schema letrix to authenticated, service_role;

grant select on table letrix.multiplayer_rooms to authenticated;
grant select on table letrix.multiplayer_room_players to authenticated;
grant select on table letrix.multiplayer_room_private_states to authenticated;

grant select, insert, update, delete on table letrix.multiplayer_rooms to service_role;
grant select, insert, update, delete on table letrix.multiplayer_room_players to service_role;
grant select, insert, update, delete on table letrix.multiplayer_room_private_states to service_role;
