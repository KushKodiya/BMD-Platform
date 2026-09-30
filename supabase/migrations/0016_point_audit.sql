-- Owner audit log: an append-only history of every point entry added or removed.
--
-- score_entries stays the live source of truth for totals; this table records the
-- *event stream* so the owner can see what changed and by whom -- including
-- removals, whose score_entries row is gone right after. Trades are already fully
-- recorded in the trades table (all statuses + resolved_at) and the /log page
-- shows them alongside these rows, so nothing extra is needed for trades.
--
-- Written only by the SECURITY DEFINER scoring RPCs below; the owner reads it.
-- points carries its sign: a negative 'add' is a deduction, a positive one an
-- addition. player_name is snapshotted so the log still reads right if a player
-- is later removed.

create table point_audit (
  id          uuid primary key default gen_random_uuid(),
  action      text not null check (action in ('add', 'remove')),
  player_id   uuid,
  player_name text not null,
  team_id     uuid,
  category    text not null,
  week        int,
  points      numeric not null,
  actor       uuid references profiles (id),
  at          timestamptz not null default now()
);
create index point_audit_at on point_audit (at desc);

alter table point_audit enable row level security;
create policy "owner reads audit" on point_audit for select using (is_owner());

-- Backfill 'add' events from entries that already exist so the log has history
-- from day one. Past removals are unrecoverable (the row was deleted); they'll
-- appear only for deletions made after this migration.
insert into point_audit (action, player_id, player_name, team_id, category, week, points, actor, at)
select 'add', se.player_id, coalesce(p.name, '—'), se.team_id, se.category, se.week, se.points, se.created_by, se.created_at
from score_entries se left join players p on p.id = se.player_id;

-- --- Re-define the scoring RPCs to append an audit row (logic otherwise the ----
-- same as 0013). Owner/moderator + team-access checks unchanged.

create or replace function mod_add_score(p_player uuid, p_category text, p_points numeric, p_week int)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  t_id uuid;
  p_name text;
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

  select name into p_name from players where id = p_player;
  insert into point_audit (action, player_id, player_name, team_id, category, week, points, actor)
  values ('add', p_player, coalesce(p_name, '—'), t_id, p_category,
          case when is_weekly then p_week else null end, p_points, auth.uid());
end;
$$;

create or replace function mod_delete_score(p_entry uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  e score_entries%rowtype;
  p_name text;
begin
  if not (is_owner() or is_moderator()) then raise exception 'only moderators can edit scores'; end if;
  select * into e from score_entries where id = p_entry;
  if not found then return; end if;  -- already gone
  if not has_team_access(e.team_id) then raise exception 'you do not have access to that team'; end if;

  delete from score_entries where id = p_entry;

  select name into p_name from players where id = e.player_id;
  insert into point_audit (action, player_id, player_name, team_id, category, week, points, actor)
  values ('remove', e.player_id, coalesce(p_name, '—'), e.team_id, e.category, e.week, e.points, auth.uid());
end;
$$;
