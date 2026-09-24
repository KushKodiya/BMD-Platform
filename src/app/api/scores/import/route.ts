import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Spreadsheet import seam. A sheet sync (built later) POSTs weekly player scores
// here; this route is the trust boundary, guarded by a shared secret like the
// cron routes. It writes with the service role, so it bypasses RLS -- but an
// update only touches an EXISTING snapshot row, so an unopened week or a player
// not in that week's snapshot is rejected, never created. Open the week first.
//
// Body: { "scores": [ { "week": 1, "player_id": "uuid", "points": 24.5 }, ... ] }

type ScoreInput = { week: number; player_id: string; points: number };

export async function POST(req: Request) {
  const secret = process.env.SCORES_IMPORT_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { scores?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const rows = Array.isArray(body.scores) ? (body.scores as ScoreInput[]) : null;
  if (!rows) {
    return NextResponse.json({ error: "body must be { scores: [...] }" }, { status: 400 });
  }

  const db = supabaseAdmin();
  const rejected: { week: number; player_id: string; reason: string }[] = [];
  let updated = 0;

  for (const r of rows) {
    if (
      !Number.isInteger(r?.week) ||
      typeof r?.player_id !== "string" ||
      typeof r?.points !== "number" ||
      !Number.isFinite(r.points)
    ) {
      rejected.push({ week: r?.week, player_id: r?.player_id, reason: "malformed row" });
      continue;
    }
    const { data, error } = await db
      .from("player_week_scores")
      .update({ points: r.points })
      .eq("week", r.week)
      .eq("player_id", r.player_id)
      .select("player_id");
    if (error) {
      rejected.push({ week: r.week, player_id: r.player_id, reason: error.message });
    } else if (!data || data.length === 0) {
      // No snapshot row: week not opened, or player not on any roster that week.
      rejected.push({ week: r.week, player_id: r.player_id, reason: "not in week snapshot" });
    } else {
      updated += 1;
    }
  }

  return NextResponse.json({ updated, rejected }, { status: rejected.length ? 207 : 200 });
}
