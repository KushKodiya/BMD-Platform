-- Fix: is_owner() must be SECURITY DEFINER.
--
-- 0013 added an RLS policy ON the profiles table ("owner reads profiles") that
-- calls is_owner(). But is_owner() was defined (0001) as a plain STABLE function,
-- so its internal `select ... from profiles` runs under the caller's RLS -- which
-- re-triggers the very policy being evaluated. Postgres rejects that with
-- "infinite recursion detected in policy for relation profiles", so any query the
-- owner runs against profiles that touches other rows (e.g. listing moderators)
-- errors and comes back empty.
--
-- Making is_owner() SECURITY DEFINER lets its lookup bypass RLS (it only ever
-- reads the caller's own is_owner flag via auth.uid()), which breaks the cycle.
-- This mirrors is_moderator() (0010) and has_team_access() (0013), which are
-- already SECURITY DEFINER for the same reason. Behavior is otherwise identical.
create or replace function is_owner()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select is_owner from profiles where id = auth.uid()), false);
$$;
