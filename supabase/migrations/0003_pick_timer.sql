-- Per-pick time limit + auto-pick on expiry.
--
-- The DB stays the authority: the browser renders a countdown, but only
-- auto_pick_if_expired() decides a turn actually expired, and it does that
-- under the same row lock make_pick() uses -- so a manual pick landing at the
-- buzzer and an auto-pick can never both record. Whoever gets the lock first
-- wins; the loser sees the clock has already advanced and no-ops.

-- Seconds each team gets on the clock. NULL = no limit (original behaviour).
alter table draft add column if not exists pick_seconds int;

alter table draft drop constraint if exists draft_pick_seconds_range;
alter table draft add constraint draft_pick_seconds_range
  check (pick_seconds is null or (pick_seconds >= 10 and pick_seconds <= 86400));

-- Marks picks the clock made instead of the admin, so the board can show them.
alter table picks add column if not exists auto boolean not null default false;

-- ---------------------------------------------------------------------------
-- Server time, so the browser countdown is measured against the same clock
-- that auto_pick_if_expired() compares against (not the viewer's device clock).
-- ---------------------------------------------------------------------------
create or replace function board_time()
returns timestamptz
language sql stable
as $$ select now(); $$;

-- ---------------------------------------------------------------------------
-- Owner sets the per-pick limit. Allowed during setup AND in progress (the
-- owner may need to speed things up mid-draft); it applies to the turn already
-- running, since the deadline is always turn_started_at + pick_seconds.
-- ---------------------------------------------------------------------------
create or replace function set_pick_seconds(p_seconds int)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d draft%rowtype;
begin
  if not is_owner() then raise exception 'only the owner can set the pick clock'; end if;
  if p_seconds is not null and (p_seconds < 10 or p_seconds > 86400) then
    raise exception 'pick clock must be between 10 seconds and 24 hours';
  end if;
  select * into d from draft where id = 1 for update;
  if d.status = 'complete' then raise exception 'the draft is already complete'; end if;
  update draft set pick_seconds = p_seconds where id = 1;
end;
$$;

-- ---------------------------------------------------------------------------
-- Auto-pick. Callable by ANYONE (including anonymous viewers and the cron):
-- it is self-gating -- it can only do what the clock already dictates, and it
-- reads its inputs from the locked draft row rather than from the caller.
--
-- p_expected_pick_index: the turn the caller believes is on the clock. A stale
-- tab can therefore never advance a turn it wasn't looking at. NULL skips the
-- check (the cron, which is draining whatever it finds).
--
-- Returns true when it recorded a pick, so the cron can loop to drain several
-- expired turns in one run.
-- ---------------------------------------------------------------------------
create or replace function auto_pick_if_expired(p_expected_pick_index int default null)
returns boolean
language plpgsql security definer set search_path = public
as $$
declare
  d draft%rowtype;
  on_clock uuid;
  victim uuid;
  player_total int;
  new_count int;
begin
  select * into d from draft where id = 1 for update;   -- same lock make_pick takes

  if d.status <> 'in_progress' then return false; end if;
  if d.pick_seconds is null then return false; end if;         -- no limit configured
  if d.turn_started_at is null then return false; end if;
  if p_expected_pick_index is not null and p_expected_pick_index <> d.pick_count then
    return false;                                              -- caller is a turn behind
  end if;
  if now() < d.turn_started_at + make_interval(secs => d.pick_seconds) then
    return false;                                              -- still on the clock
  end if;

  on_clock := team_on_clock(d.pick_count, d.team_order);

  -- Random survivor from the pool.
  select p.id into victim
    from players p
   where not exists (select 1 from picks k where k.player_id = p.id)
   order by random()
   limit 1;

  if victim is null then                                       -- pool already empty
    update draft set status = 'complete', turn_started_at = null where id = 1;
    return false;
  end if;

  insert into picks (pick_index, team_id, player_id, auto)
  values (d.pick_count, on_clock, victim, true);

  new_count := d.pick_count + 1;
  select count(*) into player_total from players;

  update draft
     set pick_count = new_count,
         status = case when new_count >= player_total then 'complete' else 'in_progress' end,
         turn_started_at = case when new_count >= player_total then null else now() end,
         notified_at = null
   where id = 1;

  return true;
end;
$$;

-- Viewers (anon) must be able to trip the clock, not just logged-in admins.
grant execute on function auto_pick_if_expired(int) to anon, authenticated;
grant execute on function board_time() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- make_pick() now enforces the clock on the way in.
--
-- Without this, an admin whose time ran out while every tab happened to be
-- closed could come back an hour later and still pick -- the rule would hold
-- only when someone was watching. Draining first makes every write path agree.
--
-- Note the drain settles after ONE pick per call, by construction: now() is
-- frozen for the transaction, and advancing sets turn_started_at = now(), so
-- the next team is never already expired. A long unattended gap therefore costs
-- exactly the turn that expired -- it can't cascade through the whole pool, and
-- the next team still gets their full clock.
--
-- Everything below the drain is unchanged from 0001_init.sql.
-- ---------------------------------------------------------------------------
create or replace function make_pick(p_player_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d draft%rowtype;
  on_clock uuid;
  my_team uuid;
  player_total int;
  new_count int;
  clock_ran_out boolean;
begin
  clock_ran_out := auto_pick_if_expired(null);   -- takes the same row lock

  select * into d from draft where id = 1 for update;   -- serialize picks
  if d.status <> 'in_progress' then
    if clock_ran_out then
      raise exception 'your time ran out — a random player was assigned and the draft is over';
    end if;
    raise exception 'draft is not in progress';
  end if;

  on_clock := team_on_clock(d.pick_count, d.team_order);
  select id into my_team from teams where admin_id = auth.uid();
  if my_team is null or my_team <> on_clock then
    if clock_ran_out then
      raise exception 'your time ran out — a random player was assigned and the draft moved on';
    end if;
    raise exception 'it is not your turn';
  end if;

  if not exists (select 1 from players where id = p_player_id) then
    raise exception 'no such player';
  end if;
  -- The unique constraint on picks.player_id is the real guard against a
  -- double-draft; this check just yields a friendly error first.
  if exists (select 1 from picks where player_id = p_player_id) then
    raise exception 'player already drafted';
  end if;

  insert into picks (pick_index, team_id, player_id)
  values (d.pick_count, on_clock, p_player_id);

  new_count := d.pick_count + 1;
  select count(*) into player_total from players;

  update draft
     set pick_count = new_count,
         status = case when new_count >= player_total then 'complete' else 'in_progress' end,
         turn_started_at = case when new_count >= player_total then null else now() end,
         notified_at = null
   where id = 1;
end;
$$;
