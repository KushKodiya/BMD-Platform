"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { MIN_PICK_SECONDS, MAX_PICK_SECONDS } from "@/lib/clock.mjs";

type Result = { error?: string };

const ok = (): Result => {
  revalidatePath("/");
  revalidatePath("/setup");
  return {};
};

export async function signIn(_prev: Result, form: FormData): Promise<Result> {
  const db = supabaseServer();
  const { error } = await db.auth.signInWithPassword({
    email: String(form.get("email") ?? ""),
    password: String(form.get("password") ?? ""),
  });
  if (error) return { error: error.message };
  redirect("/");
}

export async function signOut() {
  await supabaseServer().auth.signOut();
  redirect("/");
}

// --- Draft pick (on-clock admin only; enforced in make_pick RPC) ---
export async function pickPlayer(_prev: Result, form: FormData): Promise<Result> {
  const db = supabaseServer();
  const { error } = await db.rpc("make_pick", { p_player_id: String(form.get("player_id")) });
  if (error) return { error: error.message };
  return ok();
}

// --- Pick clock expiry: anyone may trip it, the RPC decides if it's real ---
// Called by the board's countdown when it reaches zero. The caller passes the
// turn it was watching, so a stale tab can't advance a turn it never saw; the
// RPC still re-checks the deadline against the DB clock under a row lock, so a
// wrong or hostile call can only do what the clock already dictates.
export async function autoPickIfExpired(expectedPickIndex: number): Promise<Result> {
  const { error } = await supabaseServer().rpc("auto_pick_if_expired", {
    p_expected_pick_index: expectedPickIndex,
  });
  if (error) return { error: error.message };
  return ok();
}

// --- Owner setup: the per-pick time limit (RPC enforces owner) ---
export async function setPickSeconds(seconds: number | null): Promise<Result> {
  if (seconds !== null && (!Number.isFinite(seconds) || seconds < MIN_PICK_SECONDS || seconds > MAX_PICK_SECONDS)) {
    return { error: `Pick clock must be between ${MIN_PICK_SECONDS} seconds and 24 hours.` };
  }
  const { error } = await supabaseServer().rpc("set_pick_seconds", {
    p_seconds: seconds === null ? null : Math.round(seconds),
  });
  if (error) return { error: error.message };
  return ok();
}

// --- Owner setup: defending champion (RPC enforces owner) ---
export async function setChampionTeam(teamId: string | null): Promise<Result> {
  const { error } = await supabaseServer().rpc("set_champion_team", { p_team_id: teamId });
  if (error) return { error: error.message };
  return ok();
}

// --- Owner setup: player pool (RLS enforces owner + status=setup) ---
export async function addPlayer(_prev: Result, form: FormData): Promise<Result> {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };
  const db = supabaseServer();
  const { error } = await db.from("players").insert({
    name,
    year_in_school: String(form.get("year_in_school") ?? "").trim() || null,
    major: String(form.get("major") ?? "").trim() || null,
  });
  if (error) return { error: error.message };
  return ok();
}

export async function removePlayer(form: FormData): Promise<void> {
  await supabaseServer().from("players").delete().eq("id", String(form.get("id")));
  revalidatePath("/setup");
}

// --- Owner setup: draft order + start (RPCs enforce owner + setup) ---
export async function setOrder(orderedTeamIds: string[]): Promise<Result> {
  const { error } = await supabaseServer().rpc("set_team_order", { p_order: orderedTeamIds });
  if (error) return { error: error.message };
  return ok();
}

export async function randomizeOrder(): Promise<Result> {
  const db = supabaseServer();
  const { data: teams } = await db.from("teams").select("id");
  const ids = (teams ?? []).map((t) => t.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const { error } = await db.rpc("set_team_order", { p_order: ids });
  if (error) return { error: error.message };
  return ok();
}

export async function startDraft(): Promise<Result> {
  const { error } = await supabaseServer().rpc("start_draft");
  if (error) return { error: error.message };
  return ok();
}

// --- Owner: season schedule + opening weeks (RPCs enforce owner) ---
const seasonOk = (): Result => {
  revalidatePath("/setup");
  revalidatePath("/schedule");
  revalidatePath("/matchups");
  revalidatePath("/standings");
  return {};
};

export async function generateSchedule(): Promise<Result> {
  const { error } = await supabaseServer().rpc("generate_schedule");
  if (error) return { error: error.message };
  return seasonOk();
}

export async function openWeek(week: number): Promise<Result> {
  const { error } = await supabaseServer().rpc("open_week", { p_week: week });
  if (error) return { error: error.message };
  return seasonOk();
}

// --- Admin: own email only (RPC scopes to auth.uid()) ---
export async function updateMyEmail(_prev: Result, form: FormData): Promise<Result> {
  const { error } = await supabaseServer().rpc("update_my_email", {
    p_email: String(form.get("email") ?? "").trim(),
  });
  if (error) return { error: error.message };
  revalidatePath("/account");
  return {};
}

// --- Admin: own team name only (RPC scopes to auth.uid()) ---
export async function updateMyTeamName(_prev: Result, form: FormData): Promise<Result> {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Team name is required." };
  const { error } = await supabaseServer().rpc("set_my_team_name", { p_name: name });
  if (error) return { error: error.message };
  revalidatePath("/account");
  revalidatePath("/");
  return {};
}

// --- Trades: propose / respond / cancel (RPCs enforce ownership + status) ---
const tradeOk = (): Result => {
  revalidatePath("/account");
  revalidatePath("/");
  return {};
};

export async function proposeTrade(
  toTeamId: string,
  fromPlayerIds: string[],
  toPlayerIds: string[],
): Promise<Result> {
  const { error } = await supabaseServer().rpc("propose_trade", {
    p_to_team: toTeamId,
    p_from_players: fromPlayerIds,
    p_to_players: toPlayerIds,
  });
  if (error) return { error: error.message };
  return tradeOk();
}

export async function respondTrade(tradeId: string, accept: boolean): Promise<Result> {
  const { error } = await supabaseServer().rpc("respond_trade", {
    p_trade_id: tradeId,
    p_accept: accept,
  });
  if (error) return { error: error.message };
  return tradeOk();
}

export async function cancelTrade(tradeId: string): Promise<Result> {
  const { error } = await supabaseServer().rpc("cancel_trade", { p_trade_id: tradeId });
  if (error) return { error: error.message };
  return tradeOk();
}
