"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

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
