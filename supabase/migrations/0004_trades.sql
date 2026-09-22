-- Player trades between two teams.
--
-- A trade reassigns roster ownership by swapping the (player_id, auto) payload
-- between the two teams' existing pick rows -- team_id and pick_index never move.
-- Because both sides trade the SAME number of players, every team keeps its exact
-- set of pick slots (one per round), so the snake board stays rectangular and the
-- rosters (picks grouped by team_id) simply show the new owners. See
-- openspec/changes/add-player-trading/design.md (D1).
--
-- All writes go through the SECURITY DEFINER RPCs below; RLS denies direct writes,
-- exactly like make_pick()/set_my_team_name().

-- ---------------------------------------------------------------------------
-- Swapping player_id between two rows transiently duplicates a value within the
-- statement. A non-deferrable UNIQUE fails immediately; deferring it to commit
-- lets the two-row swap succeed. make_pick()'s single-row inserts are unaffected.
-- ---------------------------------------------------------------------------
alter table picks drop constraint if exists picks_player_id_key;
alter table picks add constraint picks_player_id_key
  unique (player_id) deferrable initially deferred;

-- ---------------------------------------------------------------------------
-- Trades table. from_* is the proposer, to_* is the partner who responds.
-- The two player arrays are equal, non-zero length (equal-count trades only).
-- ---------------------------------------------------------------------------
create table trades (
  id             uuid primary key default gen_random_uuid(),
  from_team_id   uuid not null references teams (id) on delete cascade,
  to_team_id     uuid not null references teams (id) on delete cascade,
  from_player_ids uuid[] not null,
  to_player_ids   uuid[] not null,
  status         text not null default 'pending'
                   check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at     timestamptz not null default now(),
  resolved_at    timestamptz,
  check (from_team_id <> to_team_id),
  check (array_length(from_player_ids, 1) = array_length(to_player_ids, 1)
         and array_length(from_player_ids, 1) >= 1)
);

create index trades_to_team_pending on trades (to_team_id) where status = 'pending';
create index trades_from_team_pending on trades (from_team_id) where status = 'pending';

-- Team owned by the current user, or null. Small helper the RPCs share.
create or replace function my_team_id()
returns uuid
language sql stable
as $$ select id from teams where admin_id = auth.uid(); $$;

-- All p_players are currently owned by p_team (and, since picks.player_id is
-- unique, this also rejects duplicates and unknown players).
create or replace function team_owns_all(p_team uuid, p_players uuid[])
returns boolean
language sql stable
as $$
  select (select count(*) from picks where team_id = p_team and player_id = any(p_players))
         = coalesce(array_length(p_players, 1), 0);
$$;

-- ---------------------------------------------------------------------------
-- propose_trade: the caller offers p_from_players (their own) for p_to_players
-- (p_to_team's). Records a pending trade. Allowed only after the draft starts.
-- ---------------------------------------------------------------------------
create or replace function propose_trade(p_to_team uuid, p_from_players uuid[], p_to_players uuid[])
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  my_team uuid := my_team_id();
  d_status text;
  new_id uuid;
begin
  if my_team is null then raise exception 'you do not own a team'; end if;
  if p_to_team is null or p_to_team = my_team then
    raise exception 'choose a different team to trade with';
  end if;
  if not exists (select 1 from teams where id = p_to_team) then
    raise exception 'no such team';
  end if;

  select status into d_status from draft where id = 1;
  if d_status = 'setup' then raise exception 'trading opens once the draft starts'; end if;

  if coalesce(array_length(p_from_players, 1), 0) < 1
     or array_length(p_from_players, 1) is distinct from array_length(p_to_players, 1) then
    raise exception 'both teams must trade the same number of players';
  end if;

  if not team_owns_all(my_team, p_from_players) then
    raise exception 'you can only offer players your team currently owns';
  end if;
  if not team_owns_all(p_to_team, p_to_players) then
    raise exception 'that team does not own all of the requested players';
  end if;

  insert into trades (from_team_id, to_team_id, from_player_ids, to_player_ids)
  values (my_team, p_to_team, p_from_players, p_to_players)
  returning id into new_id;
  return new_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- respond_trade: only the receiving team's admin. On accept, re-verify current
-- ownership under a lock and swap the (player_id, auto) payloads pairwise.
-- ---------------------------------------------------------------------------
create or replace function respond_trade(p_trade_id uuid, p_accept boolean)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  t trades%rowtype;
  my_team uuid := my_team_id();
  i int;
  from_pick uuid; from_auto boolean;
  to_pick uuid;   to_auto boolean;
begin
  select * into t from trades where id = p_trade_id for update;
  if not found then raise exception 'no such trade'; end if;
  if my_team is null or t.to_team_id <> my_team then
    raise exception 'only the receiving team can respond to this trade';
  end if;
  if t.status <> 'pending' then raise exception 'this trade is no longer pending'; end if;

  if not p_accept then
    update trades set status = 'declined', resolved_at = now() where id = t.id;
    return;
  end if;

  -- Lock every pick row this trade touches so two overlapping trades that share
  -- a player can't both swap it; the second to run re-validates and fails below.
  perform 1 from picks
   where player_id = any(t.from_player_ids || t.to_player_ids) for update;

  if not team_owns_all(t.from_team_id, t.from_player_ids)
     or not team_owns_all(t.to_team_id, t.to_player_ids) then
    raise exception 'the trade is no longer valid — a player has since changed teams';
  end if;

  -- Swap payloads pairwise. player_id (and its auto flag) move; team_id/pick_index stay.
  for i in 1 .. array_length(t.from_player_ids, 1) loop
    select id, auto into from_pick, from_auto from picks where player_id = t.from_player_ids[i];
    select id, auto into to_pick,   to_auto   from picks where player_id = t.to_player_ids[i];
    update picks set player_id = t.to_player_ids[i],   auto = to_auto   where id = from_pick;
    update picks set player_id = t.from_player_ids[i], auto = from_auto where id = to_pick;
  end loop;

  update trades set status = 'accepted', resolved_at = now() where id = t.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- cancel_trade: only the proposing team's admin, only while pending.
-- ---------------------------------------------------------------------------
create or replace function cancel_trade(p_trade_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  t trades%rowtype;
  my_team uuid := my_team_id();
begin
  select * into t from trades where id = p_trade_id for update;
  if not found then raise exception 'no such trade'; end if;
  if my_team is null or t.from_team_id <> my_team then
    raise exception 'only the proposing team can cancel this trade';
  end if;
  if t.status <> 'pending' then raise exception 'this trade is no longer pending'; end if;
  update trades set status = 'cancelled', resolved_at = now() where id = t.id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security: only the two involved admins (and the owner) may read a
-- trade. No write policy -- writes go through the RPCs above.
-- ---------------------------------------------------------------------------
alter table trades enable row level security;

create policy "read own trades" on trades for select using (
  is_owner()
  or from_team_id in (select id from teams where admin_id = auth.uid())
  or to_team_id   in (select id from teams where admin_id = auth.uid())
);
