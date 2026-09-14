import { supabaseServer } from "@/lib/supabase/server";
import { teamOnClock, totalRounds } from "@/lib/snake.mjs";

export type Team = { id: string; name: string; admin_id: string | null };
export type Player = { id: string; name: string; year_in_school: string | null; major: string | null };
export type Pick = { pick_index: number; team_id: string; player_id: string };
export type Draft = {
  status: "setup" | "in_progress" | "complete";
  team_order: string[];
  pick_count: number;
  turn_started_at: string | null;
};

export type BoardState = {
  draft: Draft;
  teams: Team[];
  orderedTeams: Team[];
  players: Player[];
  available: Player[];
  rosters: Record<string, Player[]>; // team_id -> players in pick order
  grid: (Player | null)[][]; // [round][orderPosition]
  onClockTeamId: string | null;
  rounds: number;
};

// Assemble everything the board needs in one read. Public read (RLS allows it),
// so viewers get this without logging in.
export async function getBoardState(): Promise<BoardState> {
  const db = supabaseServer();
  const [{ data: draftRow }, { data: teams }, { data: players }, { data: picks }] =
    await Promise.all([
      db.from("draft").select("*").eq("id", 1).single(),
      db.from("teams").select("id, name, admin_id"),
      db.from("players").select("id, name, year_in_school, major").order("name"),
      db.from("picks").select("pick_index, team_id, player_id").order("pick_index"),
    ]);

  const draft: Draft = {
    status: draftRow?.status ?? "setup",
    team_order: draftRow?.team_order ?? [],
    pick_count: draftRow?.pick_count ?? 0,
    turn_started_at: draftRow?.turn_started_at ?? null,
  };
  const teamList = (teams ?? []) as Team[];
  const playerList = (players ?? []) as Player[];
  const pickList = (picks ?? []) as Pick[];

  const teamById = new Map(teamList.map((t) => [t.id, t]));
  const playerById = new Map(playerList.map((p) => [p.id, p]));
  const orderedTeams = draft.team_order.map((id) => teamById.get(id)).filter(Boolean) as Team[];

  const draftedIds = new Set(pickList.map((p) => p.player_id));
  const available = playerList.filter((p) => !draftedIds.has(p.id));

  const rosters: Record<string, Player[]> = Object.fromEntries(teamList.map((t) => [t.id, []]));
  for (const pk of pickList) {
    const pl = playerById.get(pk.player_id);
    if (pl && rosters[pk.team_id]) rosters[pk.team_id].push(pl);
  }

  const n = orderedTeams.length || teamList.length;
  const rounds = Math.max(1, totalRounds(playerList.length, n || 1));
  const grid: (Player | null)[][] = Array.from({ length: rounds }, () =>
    Array.from({ length: n }, () => null)
  );
  for (const pk of pickList) {
    const round = Math.floor(pk.pick_index / n);
    const pos = draft.team_order.indexOf(pk.team_id); // column = team's slot in the order
    if (grid[round] && pos >= 0) grid[round][pos] = playerById.get(pk.player_id) ?? null;
  }

  const onClockTeamId =
    draft.status === "in_progress" && orderedTeams.length
      ? teamOnClock(draft.pick_count, draft.team_order)
      : null;

  return { draft, teams: teamList, orderedTeams, players: playerList, available, rosters, grid, onClockTeamId, rounds };
}

// The logged-in user's role context (null userId = anonymous viewer).
export async function getUserContext() {
  const db = supabaseServer();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { userId: null, isOwner: false, myTeamId: null as string | null };

  const [{ data: profile }, { data: team }] = await Promise.all([
    db.from("profiles").select("is_owner").eq("id", user.id).single(),
    db.from("teams").select("id").eq("admin_id", user.id).maybeSingle(),
  ]);
  return { userId: user.id, isOwner: !!profile?.is_owner, myTeamId: team?.id ?? null };
}
