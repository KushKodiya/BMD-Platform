-- Owner roster corrections: put a different player in an existing pick slot.
--
-- Follows the same invariant trades established (0004, design.md D1): a pick
-- row's (team_id, pick_index) IS the slot and never moves -- only the player_id
-- payload does. Every team therefore keeps exactly its own set of slots, the
-- snake board stays rectangular, and rosters (picks grouped by team_id) simply
-- show the new owners.
--
-- Numbered 0007 to sit after the champion migration, but the two are
-- independent -- this one touches only picks/players and can be applied
-- whether or not 0006 has been.
--
-- Deliberately NOT offered: deleting a pick outright. pick_index has to stay
-- contiguous from 0, because team_on_clock(pick_count) walks the snake by
-- counting picks -- a hole would silently reassign every later turn. Dropping a
-- player is expressed as replacing them with someone from the pool, which keeps
-- the slot and the count intact.

-- ---------------------------------------------------------------------------
-- owner_replace_roster_player: p_out_player leaves their slot, p_in_player takes it.
--
--   p_in_player is undrafted -> straight replacement; p_out_player returns to the pool.
--   p_in_player is drafted   -> the two swap slots (and teams).
--
-- The swap transiently duplicates a player_id within the statement; 0004 already
-- made picks_player_id_key DEFERRABLE INITIALLY DEFERRED for exactly this, so the
-- check runs at commit instead of per-row.
-- ---------------------------------------------------------------------------
create or replace function owner_replace_roster_player(p_out_player uuid, p_in_player uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  out_pick uuid;
  out_auto boolean;
  in_pick  uuid;
  in_auto  boolean;
begin
  if not is_owner() then raise exception 'only the owner can edit rosters'; end if;
  if p_out_player is null or p_in_player is null then
    raise exception 'choose a player to replace and a player to bring in';
  end if;
  if p_out_player = p_in_player then
    raise exception 'those are the same player';
  end if;
  if not exists (select 1 from players where id = p_in_player) then
    raise exception 'no such player';
  end if;

  -- Lock both slots so two overlapping edits (or an edit racing a trade) can't
  -- both move the same player; the second to run re-reads and fails validation.
  perform 1 from picks where player_id in (p_out_player, p_in_player) for update;

  select id, auto into out_pick, out_auto from picks where player_id = p_out_player;
  if out_pick is null then
    raise exception 'that player is not on a roster';
  end if;

  select id, auto into in_pick, in_auto from picks where player_id = p_in_player;

  if in_pick is null then
    -- Straight replacement. The slot is now an owner correction, not whatever
    -- it was before, so the clock's auto flag no longer describes it.
    update picks set player_id = p_in_player, auto = false where id = out_pick;
  else
    -- Swap. auto travels with the player, as it does through a trade.
    update picks set player_id = p_in_player,  auto = in_auto  where id = out_pick;
    update picks set player_id = p_out_player, auto = out_auto where id = in_pick;
  end if;
end;
$$;
