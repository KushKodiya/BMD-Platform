import { redirect } from "next/navigation";
import { getUserContext } from "@/lib/draft";
import { supabaseServer } from "@/lib/supabase/server";
import { CATEGORY_LABELS } from "@/lib/scoring.mjs";
import { ClockIcon } from "../_components/Icons";

export const dynamic = "force-dynamic";

// Owner-only activity log: every point addition/deduction/removal (from
// point_audit) and every trade (from trades), merged newest-first. RLS already
// restricts point_audit to the owner; we still gate the page for a clean redirect.

type AuditRow = {
  action: "add" | "remove";
  player_name: string;
  team_id: string | null;
  category: string;
  week: number | null;
  points: number;
  actor: string | null;
  at: string;
};
type TradeRow = {
  from_team_id: string; to_team_id: string;
  from_player_ids: string[]; to_player_ids: string[];
  status: string; created_at: string; resolved_at: string | null;
};

type Event = { at: string; tag: string; text: string; who: string };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });

export default async function LogPage() {
  const { isOwner } = await getUserContext();
  if (!isOwner) redirect("/");

  const db = supabaseServer();
  const [{ data: audit }, { data: trades }, { data: teams }, { data: players }, { data: profiles }] =
    await Promise.all([
      db.from("point_audit")
        .select("action, player_name, team_id, category, week, points, actor, at")
        .order("at", { ascending: false })
        .limit(200),
      db.from("trades")
        .select("from_team_id, to_team_id, from_player_ids, to_player_ids, status, created_at, resolved_at")
        .order("created_at", { ascending: false })
        .limit(100),
      db.from("teams").select("id, name"),
      db.from("players").select("id, name"),
      db.from("profiles").select("id, email"),
    ]);

  const teamName = new Map(((teams ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]));
  const playerName = new Map(((players ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  const email = new Map(((profiles ?? []) as { id: string; email: string | null }[]).map((p) => [p.id, p.email ?? "—"]));
  const labels = CATEGORY_LABELS as Record<string, string>;
  const names = (ids: string[]) => ids.map((id) => playerName.get(id) ?? "—").join(", ");

  const events: Event[] = [];

  for (const r of (audit ?? []) as AuditRow[]) {
    const cat = labels[r.category] ?? r.category;
    const wk = r.week != null ? ` (Wk ${r.week})` : "";
    const team = r.team_id ? teamName.get(r.team_id) ?? "—" : "—";
    const text =
      r.action === "remove"
        ? `Removed ${cat}${wk} entry (was ${fmt(r.points)}) for ${r.player_name} · ${team}`
        : `${r.points < 0 ? "Deducted" : "Added"} ${fmt(Math.abs(r.points))} ${cat}${wk} for ${r.player_name} · ${team}`;
    events.push({ at: r.at, tag: r.action === "remove" ? "Removed" : r.points < 0 ? "Deduction" : "Points", text, who: r.actor ? email.get(r.actor) ?? "—" : "—" });
  }

  for (const t of (trades ?? []) as TradeRow[]) {
    const from = teamName.get(t.from_team_id) ?? "—";
    const to = teamName.get(t.to_team_id) ?? "—";
    events.push({
      at: t.resolved_at ?? t.created_at,
      tag: "Trade",
      text: `${from} [${names(t.from_player_ids)}] ⇄ ${to} [${names(t.to_player_ids)}] — ${t.status}`,
      who: "",
    });
  }

  events.sort((a, b) => (a.at < b.at ? 1 : -1));

  return (
    <>
      <header className="section" style={{ marginTop: "0.5rem" }}>
        <p className="eyebrow"><ClockIcon size={13} /> Owner</p>
        <h1 className="display-gradient">Activity log</h1>
        <p className="muted" style={{ margin: 0 }}>
          Every point addition, deduction, removal, and trade, newest first.
        </p>
      </header>

      <section className="section" style={{ marginTop: "1rem" }}>
        {events.length === 0 ? (
          <div className="empty"><p style={{ margin: 0 }}>No activity yet.</p></div>
        ) : (
          <ul className="entry-list">
            {events.map((e, i) => (
              <li key={i} className="entry-row">
                <span className="dim" style={{ flex: "0 0 6.5rem" }}>{e.tag}</span>
                <span className="entry-name" style={{ flex: "1 1 auto" }}>{e.text}</span>
                <span className="dim">{when(e.at)}{e.who ? ` · ${e.who}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
