import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { teamOnClock } from "@/lib/snake.mjs";
import { drainExpiredTurns } from "@/lib/autopick";

export const dynamic = "force-dynamic";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

// Runs on a schedule (see vercel.json). Sends ONE nudge to the on-clock admin
// once their turn has been idle past the threshold (4h with no pick clock, or
// halfway through the clock when one is set). The nudge itself never advances
// the clock — it only sets notified_at, so the same team stays on the clock
// until they pick or auto_pick_if_expired() takes the turn from them.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();

  // Clear any expired turns before reading state, so we never nudge a team
  // whose clock has already run out (this route runs more often than the
  // dedicated autopick cron on plans that only allow a couple of jobs).
  await drainExpiredTurns(db);

  const { data: draft } = await db.from("draft").select("*").eq("id", 1).single();

  if (!draft || draft.status !== "in_progress") return NextResponse.json({ nudged: false });
  if (draft.notified_at) return NextResponse.json({ nudged: false }); // already nudged this turn
  if (!draft.turn_started_at) return NextResponse.json({ nudged: false });

  // With a pick clock set, nudge at the halfway mark instead of 4h -- a 4h
  // threshold would never fire on, say, a 5-minute clock.
  const threshold = draft.pick_seconds
    ? Math.min(FOUR_HOURS_MS, (draft.pick_seconds * 1000) / 2)
    : FOUR_HOURS_MS;

  const idleMs = Date.now() - new Date(draft.turn_started_at).getTime();
  if (idleMs <= threshold) return NextResponse.json({ nudged: false }); // still early

  const teamId = teamOnClock(draft.pick_count, draft.team_order);
  const { data: team } = await db.from("teams").select("admin_id, name").eq("id", teamId).single();
  const { data: profile } = team?.admin_id
    ? await db.from("profiles").select("email").eq("id", team.admin_id).single()
    : { data: null };

  // Send first, then mark notified — so we don't burn the one-shot flag on a failure.
  const { sendNudge } = await import("@/lib/notify");
  await sendNudge(
    { email: profile?.email ?? null },
    "You're on the clock",
    draft.pick_seconds
      ? `It's ${team?.name ?? "your team"}'s turn to draft, and the pick clock is running. ` +
        `If time runs out you'll be assigned a random player from the remaining pool.`
      : `It's ${team?.name ?? "your team"}'s turn to draft. Make your pick to keep the draft moving.`
  );
  await db.from("draft").update({ notified_at: new Date().toISOString() }).eq("id", 1);

  return NextResponse.json({ nudged: true });
}
