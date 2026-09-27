import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/draft";
import { getSeasonMeta } from "@/lib/season";
import { supabaseServer } from "@/lib/supabase/server";
import { openWeek } from "@/lib/week.mjs";
import { CATEGORY_LABELS } from "@/lib/scoring.mjs";
import ScoreEntryForm, { type RecentEntry } from "../_components/ScoreEntryForm";
import { PlusIcon } from "../_components/Icons";

export const dynamic = "force-dynamic";

export default async function ScoresPage() {
  const { userId, isModerator, isOwner } = await getUserContext();
  if (!isModerator) redirect("/");

  const db = supabaseServer();

  // A non-owner moderator is scoped to the teams the owner granted them: they can
  // only pick those teams' players and only see/remove those teams' entries.
  let allowedTeams: Set<string> | null = null; // null = owner, no restriction
  if (!isOwner) {
    const { data: access } = await db
      .from("moderator_team_access")
      .select("team_id")
      .eq("moderator_id", userId!);
    allowedTeams = new Set(((access ?? []) as { team_id: string }[]).map((a) => a.team_id));
  }

  const [{ weeks }, { data: picks }, { data: players }, { data: entries }] = await Promise.all([
    getSeasonMeta(),
    db.from("picks").select("player_id, team_id"),
    db.from("players").select("id, name").order("name"),
    db.from("score_entries")
      .select("id, player_id, team_id, category, week, points, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const teamOfPlayer = new Map(((picks ?? []) as { player_id: string; team_id: string }[]).map((p) => [p.player_id, p.team_id]));
  const canScore = (teamId: string | undefined) => allowedTeams == null || (!!teamId && allowedTeams.has(teamId));

  const playerList = ((players ?? []) as { id: string; name: string }[])
    .filter((p) => canScore(teamOfPlayer.get(p.id)));
  const nameById = new Map(((players ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  const labels = CATEGORY_LABELS as Record<string, string>;
  const recent: RecentEntry[] = ((entries ?? []) as {
    id: string; player_id: string; team_id: string; category: string; week: number | null; points: number;
  }[])
    .filter((e) => canScore(e.team_id)) // mods only see entries they may remove
    .map((e) => ({
      id: e.id,
      playerName: nameById.get(e.player_id) ?? "—",
      categoryLabel: labels[e.category] ?? e.category,
      week: e.week,
      points: Number(e.points),
    }));

  const noAccess = allowedTeams != null && allowedTeams.size === 0;

  return (
    <>
      <header className="section" style={{ marginTop: "0.5rem" }}>
        <p className="eyebrow"><PlusIcon size={13} /> Moderator</p>
        <h1 className="display-gradient">Enter scores</h1>
        <p className="muted" style={{ margin: 0 }}>
          Log weekly points (office hours, studying, workouts) or exam/IM points. Team and player
          totals update automatically.
        </p>
      </header>

      <section className="section" style={{ marginTop: "1rem" }}>
        {noAccess ? (
          <div className="empty">
            <p style={{ margin: 0 }}>You don&apos;t have access to any teams yet.</p>
            <p className="dim" style={{ margin: 0 }}>The owner grants team access from the Setup page.</p>
          </div>
        ) : weeks.length === 0 ? (
          <div className="empty">
            <p style={{ margin: 0 }}>No schedule yet — the owner generates it after the draft.</p>
          </div>
        ) : (
          <ScoreEntryForm
            players={playerList}
            weeks={weeks}
            openWeek={openWeek(weeks)}
            isOwner={isOwner}
            recent={recent}
          />
        )}
      </section>
    </>
  );
}
