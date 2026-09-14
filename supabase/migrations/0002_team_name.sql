-- Lets an admin rename their own team (only their own). Run in the SQL editor.
create or replace function set_my_team_name(p_name text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if coalesce(trim(p_name), '') = '' then raise exception 'team name cannot be empty'; end if;
  update teams set name = trim(p_name) where admin_id = auth.uid();
  if not found then raise exception 'you do not own a team'; end if;
end;
$$;
