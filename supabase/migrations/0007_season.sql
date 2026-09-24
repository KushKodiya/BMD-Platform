-- Season layer over a completed draft: a fixed weekly schedule, per-week roster
-- snapshots scored from each player's performance, matchup results with a win
-- bonus, and derived standings. See openspec/changes/add-season-matchups.
--
-- Same shape as the rest of the platform: the DB is the source of truth, all
-- writes go through owner-only SECURITY DEFINER RPCs, and RLS grants public
-- reads. Scores are the only writable input; totals, winners, and standings are
-- derived views, so a score edit ripples through with no extra writes.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- The fixed schedule. One row per game; the bye team for a week is the team
-- absent from that week's rows. Each team plays at most one game per week.
create table season_matchups (
  week         int  not null,
  home_team_id uuid not null references teams (id) on delete cascade,
  away_team_id uuid not null references teams (id) on delete cascade,
  primary key (week, home_team_id),
  unique (week, away_team_id),
  check (home_team_id <> away_team_id)
);

-- Per-week player scores. open_week() writes one row per current pick, freezing
-- team_id -- THAT is the roster snapshot, so a later trade (which only touches
-- picks) never shifts an already-opened week. The spreadsheet fills in points.
create table player_week_scores (
  week      int     not null,
  player_id uuid    not null references players (id) on delete cascade,
  team_id   uuid    not null references teams (id)   on delete cascade,
  points    numeric not null default 0,
  primary key (week, player_id)
);
create index player_week_scores_team on player_week_scores (week, team_id);

-- ---------------------------------------------------------------------------
-- generate_schedule: owner builds the season once, after the draft completes.
-- Single round-robin by the circle method over a randomly shuffled team list:
-- with an odd team count there is one bye per week and the season spans
-- (team count) weeks, so every team byes exactly once and faces each rival once.
-- ---------------------------------------------------------------------------
create or replace function generate_schedule()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d_status text;
  ids uuid[];
  n int; m int; rounds int;
  arr uuid[];
  r int; i int; j int; wk int;
  a uuid; b uuid; tmp uuid;
begin
  if not is_owner() then raise exception 'only the owner can generate the schedule'; end if;

  select status into d_status from draft where id = 1;
  if d_status <> 'complete' then
    raise exception 'the draft must be complete before generating the schedule';
  end if;
  if exists (select 1 from season_matchups) then
    raise exception 'the schedule has already been generated';
  end if;

  select array_agg(id) into ids from teams;
  n := coalesce(array_length(ids, 1), 0);
  if n < 2 then raise exception 'need at least two teams to build a schedule'; end if;

  -- Fisher-Yates shuffle so opponents differ from season to season.
  for i in reverse n .. 2 loop
    j := 1 + floor(random() * i)::int;   -- 1..i
    tmp := ids[i]; ids[i] := ids[j]; ids[j] := tmp;
  end loop;

  -- Pad with a NULL "bye" slot when odd so the circle has an even size.
  arr := ids;
  if n % 2 = 1 then arr := array_append(arr, NULL::uuid); end if;
  m := array_length(arr, 1);
  rounds := m - 1;

  for r in 0 .. rounds - 1 loop
    wk := r + 1;
    for i in 0 .. (m / 2) - 1 loop
      a := arr[i + 1];
      b := arr[m - i];
      -- a NULL side means the real team on the other side is on a bye: store nothing.
      if a is not null and b is not null then
        insert into season_matchups (week, home_team_id, away_team_id) values (wk, a, b);
      end if;
    end loop;
    -- Rotate: keep arr[1] fixed, rotate arr[2..m] one step clockwise.
    tmp := arr[m];
    for i in reverse m .. 3 loop arr[i] := arr[i - 1]; end loop;
    arr[2] := tmp;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- open_week: snapshot every team's current roster into player_week_scores for
-- the week (points 0 until supplied). Idempotent -- re-opening leaves the
-- existing snapshot untouched, so a trade after opening cannot rewrite it.
-- ---------------------------------------------------------------------------
create or replace function open_week(p_week int)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_owner() then raise exception 'only the owner can open a week'; end if;
  if not exists (select 1 from season_matchups where week = p_week) then
    raise exception 'no such week in the schedule';
  end if;
  if exists (select 1 from player_week_scores where week = p_week) then
    return;  -- already opened
  end if;
  insert into player_week_scores (week, player_id, team_id, points)
  select p_week, pk.player_id, pk.team_id, 0 from picks pk;
end;
$$;

-- ---------------------------------------------------------------------------
-- set_player_score: owner sets one player's points for an opened week. Only
-- updates an existing snapshot row, so an unopened week or a player not in the
-- snapshot (e.g. traded in after opening) is rejected. The spreadsheet import
-- route writes the same rows directly via the service role (RLS-bypassing),
-- guarded at the route -- mirrors the cron/autopick pattern.
-- ---------------------------------------------------------------------------
create or replace function set_player_score(p_week int, p_player_id uuid, p_points numeric)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_owner() then raise exception 'only the owner can set scores'; end if;
  update player_week_scores set points = p_points
   where week = p_week and player_id = p_player_id;
  if not found then
    raise exception 'player is not in week % (open the week first)', p_week;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Derived views. Scores are the only writable input; these recompute on read.
-- ---------------------------------------------------------------------------

-- A team's weekly score is the AVERAGE of its snapshot players' points, so a
-- smaller roster is not penalized. Unscored players default to 0 and stay in
-- the divisor (count(*) = snapshot roster size).
create or replace view team_week_scores as
  select week, team_id,
         sum(points)              as total,
         count(*)                 as roster_size,
         sum(points)::numeric / count(*) as avg_points
  from player_week_scores
  group by week, team_id;

-- Per-matchup result: the higher average wins; equal averages -> no winner.
create or replace view matchup_results as
  select m.week, m.home_team_id, m.away_team_id,
         h.avg_points as home_avg,
         a.avg_points as away_avg,
         case
           when h.avg_points > a.avg_points then m.home_team_id
           when a.avg_points > h.avg_points then m.away_team_id
           else null
         end as winner_team_id
  from season_matchups m
  left join team_week_scores h on h.week = m.week and h.team_id = m.home_team_id
  left join team_week_scores a on a.week = m.week and a.team_id = m.away_team_id;

-- Standings: season points = sum of weekly averages across every opened week
-- (bye weeks included) + 25 per week won.
create or replace view standings as
  select t.id as team_id, t.name, t.is_champion,
         coalesce(pts.avg_total, 0)                    as points_from_play,
         coalesce(w.wins, 0)                           as wins,
         coalesce(pts.avg_total, 0) + 25 * coalesce(w.wins, 0) as season_points
  from teams t
  left join (
    select team_id, sum(avg_points) as avg_total
    from team_week_scores group by team_id
  ) pts on pts.team_id = t.id
  left join (
    select winner_team_id as team_id, count(*) as wins
    from matchup_results where winner_team_id is not null
    group by winner_team_id
  ) w on w.team_id = t.id;

-- ---------------------------------------------------------------------------
-- Row Level Security: public reads, no direct writes (writes go through the
-- RPCs above, or the service role for the import route).
-- ---------------------------------------------------------------------------
alter table season_matchups     enable row level security;
alter table player_week_scores  enable row level security;

create policy "read matchups" on season_matchups    for select using (true);
create policy "read scores"   on player_week_scores for select using (true);

grant select on team_week_scores, matchup_results, standings to anon, authenticated;
