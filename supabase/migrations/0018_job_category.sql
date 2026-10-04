-- Split jobs out of office hours: a new weekly category 'job' worth 0.1 (office
-- hours stay 0.4). Jobs count toward the weekly matchup like the other weekly
-- categories, so 'job' joins the weekly set everywhere the DB enumerates it: the
-- two score_entries check constraints, the weekly views, and mod_add_score.
--
-- Past office_hours entries aren't touched -- the old combined "office hours /
-- job" activity gave no way to tell which were jobs, so existing rows stay as
-- office hours. Only new entries use the split.

-- 1. Allow 'job', and make it a weekly category (must carry a week).
alter table score_entries drop constraint if exists score_entries_category_check;
alter table score_entries add constraint score_entries_category_check
  check (category in ('office_hours', 'job', 'studying', 'workout', 'exam', 'im_sport'));

alter table score_entries drop constraint if exists score_entries_check;
alter table score_entries add constraint score_entries_week_rule
  check ((category in ('office_hours', 'job', 'studying', 'workout')) = (week is not null));

-- 2. Weekly team score + the player weekly subset now include 'job'. Column
-- shapes are unchanged, so create-or-replace leaves dependent views intact.
create or replace view team_week_scores as
  select se.week, se.team_id,
         sum(se.points)                                        as weekly_total,
         mc.member_count,
         sum(se.points)::numeric / nullif(mc.member_count, 0)  as avg_points
  from score_entries se
  join team_member_counts mc on mc.team_id = se.team_id
  where se.category in ('office_hours', 'job', 'studying', 'workout')
  group by se.week, se.team_id, mc.member_count;

create or replace view player_totals as
  select p.id as player_id, p.name,
         coalesce(sum(se.points), 0) as total_points,
         coalesce(sum(se.points) filter (where se.category in ('office_hours', 'job', 'studying', 'workout')), 0) as weekly_points
  from players p
  left join score_entries se on se.player_id = p.id
  group by p.id, p.name;

-- 3. mod_add_score: 'job' is allowed and weekly. (Same as 0016 + 'job'.)
create or replace function mod_add_score(p_player uuid, p_category text, p_points numeric, p_week int)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  t_id uuid;
  p_name text;
  is_weekly boolean := p_category in ('office_hours', 'job', 'studying', 'workout');
begin
  if not (is_owner() or is_moderator()) then raise exception 'only moderators can enter scores'; end if;
  if p_category not in ('office_hours', 'job', 'studying', 'workout', 'exam', 'im_sport') then
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
