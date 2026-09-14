-- BMD draft platform schema.
-- The DB is the source of truth for turn state and pick validity (see design.md).
-- Picks are inserted ONLY through make_pick() so the on-clock + availability
-- checks run atomically under a row lock. Viewers read freely; owner-only setup
-- writes are gated by RLS + status='setup'.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- One profile per auth user. Exactly one is the owner (super-admin).
create table profiles (
  id        uuid primary key references auth.users (id) on delete cascade,
  email     text,
  is_owner  boolean not null default false
);

-- Exactly 9 teams, each owned by one admin (admin_id unique).
create table teams (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  admin_id  uuid unique references auth.users (id) on delete set null
);

-- The draftable player pool. name required; year/major optional.
create table players (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  year_in_school text,
  major          text,
  created_at     timestamptz not null default now()
);

-- Singleton draft state row (id is pinned to 1).
create table draft (
  id              int primary key default 1 check (id = 1),
  status          text not null default 'setup'
                    check (status in ('setup', 'in_progress', 'complete')),
  team_order      uuid[] not null default '{}',
  pick_count      int not null default 0,
  turn_started_at timestamptz,
  notified_at     timestamptz
);
insert into draft (id) values (1);

-- Append-only pick log. player_id unique => a player can be drafted at most once.
-- pick_index unique => no two picks share a slot (guards concurrent double-submit).
create table picks (
  id         uuid primary key default gen_random_uuid(),
  pick_index int  not null unique,
  team_id    uuid not null references teams (id),
  player_id  uuid not null unique references players (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Snake order (mirrors src/lib/snake.mjs teamOnClock)
-- ---------------------------------------------------------------------------
create or replace function team_on_clock(pick_index int, team_order uuid[])
returns uuid
language plpgsql immutable
as $$
declare
  n int := array_length(team_order, 1);
  rnd int;
  pos int;
begin
  if n is null or n = 0 then
    raise exception 'team_order is empty';
  end if;
  rnd := pick_index / n;            -- integer division, 0-based round
  pos := pick_index % n;            -- 0-based position within the round
  if rnd % 2 = 0 then               -- even round -> forward
    return team_order[pos + 1];     -- Postgres arrays are 1-based
  else                              -- odd round -> reversed
    return team_order[n - pos];
  end if;
end;
$$;

create or replace function is_owner()
returns boolean
language sql stable
as $$
  select coalesce((select is_owner from profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------------
-- State-transition RPCs (the only write path for order/start/picks)
-- ---------------------------------------------------------------------------

-- Owner arranges the 9 teams. Allowed only during setup.
create or replace function set_team_order(p_order uuid[])
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d draft%rowtype;
begin
  if not is_owner() then raise exception 'only the owner can set the draft order'; end if;
  select * into d from draft where id = 1 for update;
  if d.status <> 'setup' then raise exception 'draft order is locked'; end if;
  if array_length(p_order, 1) is distinct from (select count(*)::int from teams) then
    raise exception 'draft order must include every team exactly once';
  end if;
  if (select count(distinct t) from unnest(p_order) t) <> array_length(p_order, 1) then
    raise exception 'draft order has duplicates';
  end if;
  update draft set team_order = p_order where id = 1;
end;
$$;

-- Owner starts the draft. Requires a non-empty pool and a complete order.
create or replace function start_draft()
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d draft%rowtype;
begin
  if not is_owner() then raise exception 'only the owner can start the draft'; end if;
  select * into d from draft where id = 1 for update;
  if d.status <> 'setup' then raise exception 'draft already started'; end if;
  if (select count(*) from players) = 0 then raise exception 'add at least one player before starting'; end if;
  if array_length(d.team_order, 1) is distinct from (select count(*)::int from teams) then
    raise exception 'set a complete draft order before starting';
  end if;
  update draft
     set status = 'in_progress', pick_count = 0,
         turn_started_at = now(), notified_at = null
   where id = 1;
end;
$$;

-- The on-clock admin drafts a player. Atomic: locks draft, verifies turn +
-- availability, inserts the pick, advances the clock, completes if pool empty.
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
begin
  select * into d from draft where id = 1 for update;   -- serialize picks
  if d.status <> 'in_progress' then raise exception 'draft is not in progress'; end if;

  on_clock := team_on_clock(d.pick_count, d.team_order);
  select id into my_team from teams where admin_id = auth.uid();
  if my_team is null or my_team <> on_clock then
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

-- Admin updates only their own notification email.
create or replace function update_my_email(p_email text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update profiles set email = p_email where id = auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table teams    enable row level security;
alter table players  enable row level security;
alter table draft    enable row level security;
alter table picks    enable row level security;

-- Public read: viewers see teams, players, draft state, and picks without login.
create policy "read teams"   on teams   for select using (true);
create policy "read players" on players for select using (true);
create policy "read draft"   on draft   for select using (true);
create policy "read picks"   on picks   for select using (true);

-- Profiles: a user may read their own row (email is private).
create policy "read own profile" on profiles for select using (id = auth.uid());

-- Player pool: owner-only CRUD, and only while the draft is in setup.
create policy "owner adds players" on players for insert
  with check (is_owner() and (select status from draft where id = 1) = 'setup');
create policy "owner edits players" on players for update
  using (is_owner() and (select status from draft where id = 1) = 'setup');
create policy "owner removes players" on players for delete
  using (is_owner() and (select status from draft where id = 1) = 'setup');

-- No direct writes to draft or picks: those go through the SECURITY DEFINER
-- RPCs above. With RLS on and no write policy, direct inserts/updates are denied.
