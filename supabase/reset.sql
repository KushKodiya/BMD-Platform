-- Drops everything this app created so 0001_init.sql can be re-applied cleanly.
-- Safe only before you have real draft data — it deletes players, picks, teams,
-- and profiles (auth.users are NOT touched; re-run setup-admins.mjs after).
drop function if exists propose_trade(uuid, uuid[], uuid[]) cascade;
drop function if exists respond_trade(uuid, boolean) cascade;
drop function if exists cancel_trade(uuid) cascade;
drop function if exists team_owns_all(uuid, uuid[]) cascade;
drop function if exists my_team_id() cascade;
drop function if exists make_pick(uuid) cascade;
drop function if exists owner_replace_roster_player(uuid, uuid) cascade;
drop function if exists auto_pick_if_expired(int) cascade;
drop function if exists set_pick_seconds(int) cascade;
drop function if exists board_time() cascade;
drop function if exists set_my_team_name(text) cascade;
drop function if exists set_team_order(uuid[]) cascade;
drop function if exists start_draft() cascade;
drop function if exists update_my_email(text) cascade;
drop function if exists team_on_clock(int, uuid[]) cascade;
drop function if exists is_owner() cascade;

drop table if exists trades cascade;
drop table if exists picks cascade;
drop table if exists draft cascade;
drop table if exists players cascade;
drop table if exists teams cascade;
drop table if exists profiles cascade;
