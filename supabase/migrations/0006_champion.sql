-- Defending champion: the team that won last semester, shown in gold.
--
-- This is a flag on the team, not a match on the team's name. Admins can rename
-- their own team through set_my_team_name(), so a name match would drop the gold
-- the moment the champion renamed -- or hand it to whoever claimed the old name.

alter table teams add column if not exists is_champion boolean not null default false;

-- At most one defending champion. The partial index only covers true rows, so
-- every other team can keep the default without colliding.
create unique index if not exists teams_one_champion
  on teams ((is_champion))
  where is_champion;

-- ---------------------------------------------------------------------------
-- Owner crowns the champion. Pass null to clear it (e.g. nobody has defended
-- yet). Clearing first keeps the unique index satisfied within the statement.
-- ---------------------------------------------------------------------------
create or replace function set_champion_team(p_team_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not is_owner() then raise exception 'only the owner can set the defending champion'; end if;
  if p_team_id is not null and not exists (select 1 from teams where id = p_team_id) then
    raise exception 'no such team';
  end if;

  update teams set is_champion = false where is_champion;
  if p_team_id is not null then
    update teams set is_champion = true where id = p_team_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- One-time seed: Yash's team won last semester. Matched by name here because
-- that is what identifies it today; from now on the flag is what counts, and
-- the owner moves it from /setup at the end of each semester.
--
-- No-op if the team has since been renamed -- set it from /setup in that case.
-- ---------------------------------------------------------------------------
update teams set is_champion = true where name = 'Monkey Business';
