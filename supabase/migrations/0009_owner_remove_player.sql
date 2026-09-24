-- Owner removes an undrafted player from the pool -- now allowed mid-draft, not
-- just during setup.
--
-- Before this, pool deletes were a raw table delete gated by the "owner removes
-- players" RLS policy, which only permitted status='setup'. But no-shows and bad
-- entries surface after picking starts, and the owner needs to prune undrafted
-- names so a team can't draft them.
--
-- Mid-draft this can't stay a raw delete: draft completion is derived
-- (make_pick, 0001: pick_count >= count(players)), so removing available players
-- shrinks that total. If a removal empties the pool the draft is logically over,
-- and only a locked transaction that re-checks completion can flip status --
-- otherwise a team sits on the clock with nobody to pick. So removal moves onto a
-- SECURITY DEFINER RPC under the draft row lock, the same serialization make_pick
-- and owner_replace_roster_player (0008) already use.

-- ---------------------------------------------------------------------------
-- owner_remove_player: delete an undrafted player; complete the draft if the
-- pool is now exhausted. Drafted players are refused -- they belong to a roster
-- slot (owner_replace_roster_player is the way to change those).
-- ---------------------------------------------------------------------------
create or replace function owner_remove_player(p_player uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d draft%rowtype;
  player_total int;
begin
  select * into d from draft where id = 1 for update;   -- serialize with picks
  if not is_owner() then raise exception 'only the owner can remove players'; end if;
  if d.status = 'complete' then raise exception 'the draft is complete'; end if;

  if not exists (select 1 from players where id = p_player) then
    raise exception 'no such player';
  end if;
  if exists (select 1 from picks where player_id = p_player) then
    raise exception 'that player is already drafted -- use roster corrections';
  end if;

  delete from players where id = p_player;

  -- Re-derive completion the same way make_pick does. Only an in-progress draft
  -- can complete this way; a setup pool emptied to zero stays in setup.
  if d.status = 'in_progress' then
    select count(*) into player_total from players;
    if d.pick_count >= player_total then
      update draft
         set status = 'complete', turn_started_at = null, notified_at = null
       where id = 1;
    end if;
  end if;
end;
$$;

-- Deletion now goes exclusively through the RPC above. Drop the raw-delete
-- policy so no direct delete on players is permitted (the definer RPC bypasses
-- RLS, like make_pick's writes to picks).
drop policy if exists "owner removes players" on players;
