-- Owner corrections to a player's details: name, year in school, and team.
-- Name/year are a straight update on players. A team change moves the player's
-- pick to the new team (the pick slot itself stays, like a trade/roster edit),
-- so member counts and future scoring follow -- past score_entries keep the
-- team they were logged under.
create or replace function owner_update_player(p_player uuid, p_name text, p_year text, p_team uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_owner() then raise exception 'only the owner can edit players'; end if;
  if not exists (select 1 from players where id = p_player) then raise exception 'no such player'; end if;
  if coalesce(btrim(p_name), '') = '' then raise exception 'a name is required'; end if;

  update players
     set name = btrim(p_name),
         year_in_school = nullif(btrim(coalesce(p_year, '')), '')
   where id = p_player;

  if p_team is not null then
    if not exists (select 1 from teams where id = p_team) then raise exception 'no such team'; end if;
    update picks set team_id = p_team where player_id = p_player;
  end if;
end;
$$;
