-- Owner adds a person to a team after the draft. Someone who missed the draft
-- (a brother who joins mid-season) needs to be on a roster to earn points, but
-- the pool insert policy is setup-only and the draft never picks them. This RPC
-- creates the player and appends a pick for the chosen team.
--
-- Only allowed once the draft is complete: appending a pick mid-draft would take
-- pick_index = current count, which make_pick also uses for the next real pick
-- (0001), so the two would collide. After completion the snake never walks again
-- and pick_index only has to stay unique -- appending at max+1 satisfies that.
create or replace function owner_add_member(p_name text, p_year text, p_major text, p_team uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  d_status text;
  new_player uuid;
  next_index int;
begin
  if not is_owner() then raise exception 'only the owner can add members'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'a name is required'; end if;
  if not exists (select 1 from teams where id = p_team) then raise exception 'no such team'; end if;

  select status into d_status from draft where id = 1 for update;  -- serialize with picks
  if d_status <> 'complete' then
    raise exception 'members can be added only after the draft is complete';
  end if;

  insert into players (name, year_in_school, major)
  values (btrim(p_name), nullif(btrim(coalesce(p_year, '')), ''), nullif(btrim(coalesce(p_major, '')), ''))
  returning id into new_player;

  select coalesce(max(pick_index), -1) + 1 into next_index from picks;
  insert into picks (pick_index, team_id, player_id, auto)
  values (next_index, p_team, new_player, false);
end;
$$;
