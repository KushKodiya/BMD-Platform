-- Per-moderator team access: the owner decides which teams each moderator may
-- score. A row here = that moderator may add and remove point entries for that
-- team's players. The owner always has access to every team.

create table moderator_team_access (
  moderator_id uuid not null references profiles (id) on delete cascade,
  team_id      uuid not null references teams (id)    on delete cascade,
  primary key (moderator_id, team_id)
);

-- True when the current user may score the given team: the owner always can, a
-- moderator only for teams granted to them.
create or replace function has_team_access(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_owner()
      or exists (select 1 from moderator_team_access
                  where moderator_id = auth.uid() and team_id = p_team);
$$;

-- Owner grants/revokes one moderator's access to one team.
create or replace function owner_set_mod_access(p_mod uuid, p_team uuid, p_enabled boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_owner() then raise exception 'only the owner can set moderator access'; end if;
  if not exists (select 1 from profiles where id = p_mod and is_moderator) then
    raise exception 'that account is not a moderator';
  end if;
  if not exists (select 1 from teams where id = p_team) then raise exception 'no such team'; end if;

  if p_enabled then
    insert into moderator_team_access (moderator_id, team_id)
    values (p_mod, p_team)
    on conflict do nothing;
  else
    delete from moderator_team_access where moderator_id = p_mod and team_id = p_team;
  end if;
end;
$$;

-- --- Re-define the scoring RPCs to enforce team access (owner unaffected). ----

create or replace function mod_add_score(p_player uuid, p_category text, p_points numeric, p_week int)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  t_id uuid;
  is_weekly boolean := p_category in ('office_hours', 'studying', 'workout');
begin
  if not (is_owner() or is_moderator()) then raise exception 'only moderators can enter scores'; end if;
  if p_category not in ('office_hours', 'studying', 'workout', 'exam', 'im_sport') then
    raise exception 'unknown category %', p_category;
  end if;
  if p_points is null then raise exception 'points required'; end if;

  select team_id into t_id from picks where player_id = p_player;
  if t_id is null then raise exception 'that player is not on a roster'; end if;
  if not has_team_access(t_id) then raise exception 'you do not have access to that team'; end if;

  if is_weekly then
    if p_week is null then raise exception 'a week is required for weekly points'; end if;
    if not exists (select 1 from season_matchups where week = p_week) then
      raise exception 'no such week in the schedule';
    end if;
  end if;

  insert into score_entries (player_id, team_id, category, week, points, created_by)
  values (p_player, t_id, p_category, case when is_weekly then p_week else null end, p_points, auth.uid());
end;
$$;

create or replace function mod_delete_score(p_entry uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  t_id uuid;
begin
  if not (is_owner() or is_moderator()) then raise exception 'only moderators can edit scores'; end if;
  select team_id into t_id from score_entries where id = p_entry;
  if t_id is null then return; end if;  -- already gone
  if not has_team_access(t_id) then raise exception 'you do not have access to that team'; end if;
  delete from score_entries where id = p_entry;
end;
$$;

-- --- RLS ---------------------------------------------------------------------
alter table moderator_team_access enable row level security;
-- The owner manages all access; a moderator may read their own grants.
create policy "owner reads mod access" on moderator_team_access for select using (is_owner());
create policy "mod reads own access"   on moderator_team_access for select using (moderator_id = auth.uid());

-- The owner needs to list moderator profiles (email + flags) to assign access;
-- everyone else still only sees their own row.
create policy "owner reads profiles" on profiles for select using (is_owner());
