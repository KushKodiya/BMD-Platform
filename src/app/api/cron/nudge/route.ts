import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { teamOnClock } from "@/lib/snake.mjs";

export const dynamic = "force-dynamic";

const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

// Runs on a schedule (see vercel.json). Sends ONE nudge to the on-clock admin
// once their turn has been idle > 4h. Never advances the clock — it only sets
// notified_at, so the same team stays on the clock until they pick.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const { data: draft } = await db.from("draft").select("*").eq("id", 1).single();

  if (!draft || draft.status !== "in_progress") return NextResponse.json({ nudged: false });
  if (draft.notified_at) return NextResponse.json({ nudged: false }); // already nudged this turn
  if (!draft.turn_started_at) return NextResponse.json({ nudged: false });

  const idleMs = Date.now() - new Date(draft.turn_started_at).getTime();
  if (idleMs <= FOUR_HOURS_MS) return NextResponse.json({ nudged: false }); // under 4h

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
    `It's ${team?.name ?? "your team"}'s turn to draft. Make your pick to keep the draft moving.`
  );
  await db.from("draft").update({ notified_at: new Date().toISOString() }).eq("id", 1);

  return NextResponse.json({ nudged: true });
}
