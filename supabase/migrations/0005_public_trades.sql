-- Public trade log.
--
-- Accepted trades become readable by everyone (including anonymous viewers) so
-- the board can show a live "who traded whom" feed. Pending / declined /
-- cancelled trades stay private to the two involved owners (the "read own
-- trades" policy from 0004). RLS SELECT policies are OR'd, so this only widens
-- visibility for rows whose status is 'accepted'.
create policy "read accepted trades" on trades for select using (status = 'accepted');
