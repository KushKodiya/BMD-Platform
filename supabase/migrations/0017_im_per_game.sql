-- IM scoring change: registration no longer awards points; each IM *game* is now
-- worth 0.5. Still the season-direct 'im_sport' category, so it never counts
-- toward a weekly matchup total -- only the catalog label/value change (in
-- scoring.mjs), no schema change needed.
--
-- Strip the old 3-pt registration entries, recording each removal in the owner
-- audit log first (actor null = this migration) so the /log page shows why they
-- disappeared. Season totals recompute on read once the rows are gone.

insert into point_audit (action, player_id, player_name, team_id, category, week, points, actor)
select 'remove', se.player_id, coalesce(p.name, '—'), se.team_id, se.category, se.week, se.points, null
from score_entries se left join players p on p.id = se.player_id
where se.category = 'im_sport';

delete from score_entries where category = 'im_sport';
