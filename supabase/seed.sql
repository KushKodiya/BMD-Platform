-- Nine teams. admin_id is linked later by scripts/setup-admins.mjs once the
-- auth accounts exist. Rename these to your real team names.
insert into teams (name) values
  ('Team 1'), ('Team 2'), ('Team 3'),
  ('Team 4'), ('Team 5'), ('Team 6'),
  ('Team 7'), ('Team 8'), ('Team 9');
