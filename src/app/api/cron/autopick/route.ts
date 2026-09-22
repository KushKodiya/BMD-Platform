import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { drainExpiredTurns } from "@/lib/autopick";

export const dynamic = "force-dynamic";

// Scheduled backstop for the pick clock (see vercel.json). The board in an open
// browser is the normal trigger; this covers the case where every tab is closed
// when a turn expires, so the draft can never sit dead on an expired clock.
// Idempotent: if nothing is expired, auto_pick_if_expired() picks nothing.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const picked = await drainExpiredTurns(supabaseAdmin());
  return NextResponse.json({ autoPicked: picked });
}
