-- Owner removes a person from the league entirely: off their team and gone from
-- the player pool, so they can no longer be drafted, rostered, or scored.
--
-- "Old points are fine": score_entries snapshots team_id at entry time (0010), so
-- every team/weekly/season total keys off the TEAM, not the player. We therefore
-- keep the entries and only detach the vanished player -- the player_id FK moves
-- from ON DELETE CASCADE to ON DELETE SET NULL. Cascade would have erased the
-- removed player's history and dropped the team's totals; SET NULL leaves the
-- points sitting with the team exactly as earned. The player simply disappears
-- from the player_totals leaderboard (that view joins players) -- intended, since
-- they're removed -- and the /scores and /log readers already fall back to "—"
-- for an entry whose player is missing.
--
-- Only after the draft is complete, mirroring owner_add_member (0011): deleting a
-- pick mid-draft would punch a hole in pick_index, which team_on_clock walks by
-- counting picks (0008). Once complete the snake never walks again and pick_index
-- only has to stay unique, so a gap is harmless.

alter table score_entries alter column player_id drop not null;
alter table score_entries drop constraint if exists score_entries_player_id_fkey;
alter table score_entries add constraint score_entries_player_id_fkey
  foreign key (player_id) references players (id) on delete set null;

-- ---------------------------------------------------------------------------
-- owner_remove_member: drop the player's roster pick, then the player. Their
-- past score_entries survive (player_id -> null, team_id kept), so historical
-- totals are untouched; going forward there's no player to score.
-- ---------------------------------------------------------------------------
create or replace function owner_remove_member(p_player uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d_status text;
begin
  if not is_owner() then raise exception 'only the owner can remove members'; end if;

  select status into d_status from draft where id = 1 for update;  -- serialize with picks
  if d_status <> 'complete' then
    raise exception 'members can be removed only after the draft is complete';
  end if;
  if not exists (select 1 from players where id = p_player) then
    raise exception 'no such player';
  end if;

  delete from picks where player_id = p_player;   -- off the roster
  delete from players where id = p_player;         -- gone from the pool; entries keep their team
end;
$$;
