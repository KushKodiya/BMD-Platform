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
  const { isModerator, isOwner } = await getUserContext();
  if (!isModerator) redirect("/");

  const db = supabaseServer();
  const [{ weeks }, { data: players }, { data: entries }] = await Promise.all([
    getSeasonMeta(),
    db.from("players").select("id, name").order("name"),
    db.from("score_entries")
      .select("id, player_id, category, week, points, created_at")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const playerList = (players ?? []) as { id: string; name: string }[];
  const nameById = new Map(playerList.map((p) => [p.id, p.name]));
  const labels = CATEGORY_LABELS as Record<string, string>;
  const recent: RecentEntry[] = ((entries ?? []) as {
    id: string; player_id: string; category: string; week: number | null; points: number;
  }[]).map((e) => ({
    id: e.id,
    playerName: nameById.get(e.player_id) ?? "—",
    categoryLabel: labels[e.category] ?? e.category,
    week: e.week,
    points: Number(e.points),
  }));

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
        {weeks.length === 0 ? (
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
