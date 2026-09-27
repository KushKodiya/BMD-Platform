-- Scoring v2: moderators log individual point entries; every team/player/season
-- total is a derived view over them. Replaces the single-number-per-week model
-- (player_week_scores + open_week + the spreadsheet import) with a per-activity
-- log.
--
-- New rules:
--   * Weekly matchup categories -- office_hours, studying, workout -- are summed
--     over a team's members for the week and divided by the member count. That
--     per-member average is the team's weekly score and drives the matchup.
--   * Season-direct categories -- exam, im_sport -- are summed over the team's
--     members and divided by the member count, then added straight to the team's
--     season total (never part of a weekly matchup).
--   * A player's total is the plain sum of every point they earned, any category.
--
-- Same platform shape as everything else: writes go through SECURITY DEFINER
-- RPCs, reads are public via RLS, totals are views that recompute on read.

-- --- Moderators: a new role that may enter scores (but nothing else). ---------
alter table profiles add column if not exists is_moderator boolean not null default false;

create or replace function is_moderator()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_moderator from profiles where id = auth.uid()), false);
$$;

-- --- The point log. team_id is the player's team at entry time, so a later ----
-- trade never rewrites past entries. week is required for weekly categories and
-- null for the season-direct ones (the check enforces both directions).
create table score_entries (
  id         uuid primary key default gen_random_uuid(),
  player_id  uuid    not null references players (id) on delete cascade,
  team_id    uuid    not null references teams (id)   on delete cascade,
  category   text    not null check (category in ('office_hours', 'studying', 'workout', 'exam', 'im_sport')),
  week       int,
  points     numeric not null,
  created_by uuid    references profiles (id),
  created_at timestamptz not null default now(),
  check ((category in ('office_hours', 'studying', 'workout')) = (week is not null))
);
create index score_entries_player on score_entries (player_id);
create index score_entries_team_week on score_entries (team_id, week);

-- --- Out with the old snapshot model. cascade drops the 0007 views too. -------
drop function if exists open_week(int) cascade;
drop function if exists set_player_score(int, uuid, numeric) cascade;
drop table if exists player_week_scores cascade;  -- takes team_week_scores/matchup_results/standings with it

-- --- Member count per team (current roster from the draft). --------------------
create or replace view team_member_counts as
  select team_id, count(*) as member_count
  from picks
  group by team_id;

-- --- Team weekly (matchup) score: weekly-category points / members. -----------
create or replace view team_week_scores as
  select se.week, se.team_id,
         sum(se.points)                                        as weekly_total,
         mc.member_count,
         sum(se.points)::numeric / nullif(mc.member_count, 0)  as avg_points
  from score_entries se
  join team_member_counts mc on mc.team_id = se.team_id
  where se.category in ('office_hours', 'studying', 'workout')
  group by se.week, se.team_id, mc.member_count;

-- --- Per-matchup result: higher weekly average wins; equal / unscored -> tie. --
create or replace view matchup_results as
  select m.week, m.home_team_id, m.away_team_id,
         coalesce(h.avg_points, 0) as home_avg,
         coalesce(a.avg_points, 0) as away_avg,
         case
           when coalesce(h.avg_points, 0) > coalesce(a.avg_points, 0) then m.home_team_id
           when coalesce(a.avg_points, 0) > coalesce(h.avg_points, 0) then m.away_team_id
           else null
         end as winner_team_id
  from season_matchups m
  left join team_week_scores h on h.week = m.week and h.team_id = m.home_team_id
  left join team_week_scores a on a.week = m.week and a.team_id = m.away_team_id;

-- --- Season-direct points per team: (exam + im_sport) / members. --------------
create or replace view team_season_direct as
  select se.team_id,
         sum(se.points)::numeric / nullif(mc.member_count, 0) as direct_points
  from score_entries se
  join team_member_counts mc on mc.team_id = se.team_id
  where se.category in ('exam', 'im_sport')
  group by se.team_id, mc.member_count;

-- --- Standings: sum of weekly averages + season-direct + 25 per week won. -----
create or replace view standings as
  select t.id as team_id, t.name, t.is_champion,
         coalesce(wk.avg_total, 0)     as points_from_play,
         coalesce(sd.direct_points, 0) as direct_points,
         coalesce(w.wins, 0)           as wins,
         coalesce(wk.avg_total, 0) + coalesce(sd.direct_points, 0) + 25 * coalesce(w.wins, 0) as season_points
  from teams t
  left join (select team_id, sum(avg_points) as avg_total from team_week_scores group by team_id) wk on wk.team_id = t.id
  left join team_season_direct sd on sd.team_id = t.id
  left join (
    select winner_team_id as team_id, count(*) as wins
    from matchup_results where winner_team_id is not null
    group by winner_team_id
  ) w on w.team_id = t.id;

-- --- Player totals: all points, plus the weekly-category subset for averages. --
create or replace view player_totals as
  select p.id as player_id, p.name,
         coalesce(sum(se.points), 0) as total_points,
         coalesce(sum(se.points) filter (where se.category in ('office_hours', 'studying', 'workout')), 0) as weekly_points
  from players p
  left join score_entries se on se.player_id = p.id
  group by p.id, p.name;

-- ---------------------------------------------------------------------------
-- Moderator write RPCs (owner counts as a moderator too).
-- ---------------------------------------------------------------------------

-- Log one point entry for a player. The player's current team is looked up from
-- the draft, so the caller never picks a team. Weekly categories require a real
-- scheduled week; season-direct ones ignore any week passed.
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

-- Remove an entry (corrections). Moderator or owner.
create or replace function mod_delete_score(p_entry uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not (is_owner() or is_moderator()) then raise exception 'only moderators can edit scores'; end if;
  delete from score_entries where id = p_entry;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: public reads, writes only through the RPCs above.
-- ---------------------------------------------------------------------------
alter table score_entries enable row level security;
create policy "read score entries" on score_entries for select using (true);

grant select on team_member_counts, team_week_scores, matchup_results,
                team_season_direct, standings, player_totals to anon, authenticated;
