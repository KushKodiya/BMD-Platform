-- Drops everything this app created so 0001_init.sql can be re-applied cleanly.
-- Safe only before you have real draft data — it deletes players, picks, teams,
-- and profiles (auth.users are NOT touched; re-run setup-admins.mjs after).
drop function if exists make_pick(uuid) cascade;
drop function if exists auto_pick_if_expired(int) cascade;
drop function if exists set_pick_seconds(int) cascade;
drop function if exists board_time() cascade;
drop function if exists set_my_team_name(text) cascade;
drop function if exists set_team_order(uuid[]) cascade;
drop function if exists start_draft() cascade;
drop function if exists update_my_email(text) cascade;
drop function if exists team_on_clock(int, uuid[]) cascade;
drop function if exists is_owner() cascade;

drop table if exists picks cascade;
drop table if exists draft cascade;
drop table if exists players cascade;
drop table if exists teams cascade;
drop table if exists profiles cascade;
