import { supabaseServer } from "@/lib/supabase/server";

// Read side of the season layer (schedule / matchups / standings). All reads are
// public via RLS, so viewers get these without logging in. Derivations (team
// averages, winners, standings) mirror the views in 0007_season.sql; standings
// come straight from the `standings` view, matchups are assembled here so each
// player's score sits beside their name.

export const WIN_BONUS = 25;

export type ScheduleGame = { home: string; away: string };
export type ScheduleWeek = {
  week: number;
  games: ScheduleGame[];
  bye: string | null;
  opened: boolean;
};

export type MatchupPlayer = { id: string; name: string; points: number };
export type MatchupTeam = {
  teamId: string;
  name: string;
  isChampion: boolean;
  players: MatchupPlayer[];
  total: number | null; // weekly average; null until the week is opened
};
export type Matchup = { home: MatchupTeam; away: MatchupTeam; winnerTeamId: string | null };
export type WeekBoard = {
  week: number;
  opened: boolean;
  matchups: Matchup[];
  byeTeam: { id: string; name: string; isChampion: boolean } | null;
};

export type StandingRow = {
  teamId: string;
  name: string;
  isChampion: boolean;
  seasonPoints: number;
  pointsFromPlay: number;
  wins: number;
};

type TeamRow = { id: string; name: string; is_champion: boolean };
type MatchupRow = { week: number; home_team_id: string; away_team_id: string };
type ScoreRow = { week: number; player_id: string; team_id: string; points: number };

// The weeks the schedule spans, and which have been opened (have a snapshot).
export async function getSeasonMeta(): Promise<{ weeks: number[]; opened: Set<number> }> {
  const db = supabaseServer();
  const [{ data: m }, { data: s }] = await Promise.all([
    db.from("season_matchups").select("week"),
    db.from("player_week_scores").select("week"),
  ]);
  const weeks = [...new Set(((m ?? []) as { week: number }[]).map((r) => r.week))].sort(
    (a, b) => a - b,
  );
  const opened = new Set(((s ?? []) as { week: number }[]).map((r) => r.week));
  return { weeks, opened };
}

// The full schedule, one entry per week, with team names and the bye team.
export async function getSchedule(): Promise<ScheduleWeek[]> {
  const db = supabaseServer();
  const [{ data: matchups }, { data: teams }, { data: scored }] = await Promise.all([
    db.from("season_matchups").select("week, home_team_id, away_team_id").order("week"),
    db.from("teams").select("id, name, is_champion"),
    db.from("player_week_scores").select("week"),
  ]);
  const teamList = (teams ?? []) as TeamRow[];
  const name = new Map(teamList.map((t) => [t.id, t.name]));
  const openedWeeks = new Set(((scored ?? []) as { week: number }[]).map((r) => r.week));

  const byWeek = new Map<number, ScheduleWeek>();
  const present = new Map<number, Set<string>>();
  for (const r of (matchups ?? []) as MatchupRow[]) {
    if (!byWeek.has(r.week)) {
      byWeek.set(r.week, { week: r.week, games: [], bye: null, opened: openedWeeks.has(r.week) });
      present.set(r.week, new Set());
    }
    byWeek.get(r.week)!.games.push({
      home: name.get(r.home_team_id) ?? "—",
      away: name.get(r.away_team_id) ?? "—",
    });
    present.get(r.week)!.add(r.home_team_id);
    present.get(r.week)!.add(r.away_team_id);
  }

  for (const [wk, week] of byWeek) {
    const seen = present.get(wk)!;
    const byeId = teamList.find((t) => !seen.has(t.id))?.id;
    week.bye = byeId ? (name.get(byeId) ?? null) : null;
  }
  return [...byWeek.values()].sort((a, b) => a.week - b.week);
}

// One week's matchups, each team's snapshot players with their scores, totals,
// and the winner. Returns null if the week has no schedule.
export async function getWeekBoard(week: number): Promise<WeekBoard | null> {
  const db = supabaseServer();
  const [{ data: matchups }, { data: teams }, { data: players }, { data: scores }] =
    await Promise.all([
      db.from("season_matchups").select("week, home_team_id, away_team_id").eq("week", week),
      db.from("teams").select("id, name, is_champion"),
      db.from("players").select("id, name"),
      db.from("player_week_scores").select("week, player_id, team_id, points").eq("week", week),
    ]);
  const matchupRows = (matchups ?? []) as MatchupRow[];
  if (matchupRows.length === 0) return null;

  const teamList = (teams ?? []) as TeamRow[];
  const teamById = new Map(teamList.map((t) => [t.id, t]));
  const playerName = new Map(((players ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
  const scoreRows = (scores ?? []) as ScoreRow[];
  const opened = scoreRows.length > 0;

  const byTeam = new Map<string, MatchupPlayer[]>();
  for (const s of scoreRows) {
    const arr = byTeam.get(s.team_id) ?? [];
    arr.push({ id: s.player_id, name: playerName.get(s.player_id) ?? "—", points: Number(s.points) });
    byTeam.set(s.team_id, arr);
  }

  const teamView = (id: string): MatchupTeam => {
    const t = teamById.get(id);
    const roster = (byTeam.get(id) ?? []).slice().sort((a, b) => b.points - a.points);
    const total = roster.length
      ? roster.reduce((sum, p) => sum + p.points, 0) / roster.length
      : null;
    return { teamId: id, name: t?.name ?? "—", isChampion: !!t?.is_champion, players: roster, total };
  };

  const matchupList: Matchup[] = matchupRows.map((r) => {
    const home = teamView(r.home_team_id);
    const away = teamView(r.away_team_id);
    let winnerTeamId: string | null = null;
    if (home.total != null && away.total != null) {
      if (home.total > away.total) winnerTeamId = home.teamId;
      else if (away.total > home.total) winnerTeamId = away.teamId;
    }
    return { home, away, winnerTeamId };
  });

  const inPlay = new Set(matchupRows.flatMap((r) => [r.home_team_id, r.away_team_id]));
  const bye = teamList.find((t) => !inPlay.has(t.id)) ?? null;

  return {
    week,
    opened,
    matchups: matchupList,
    byeTeam: bye ? { id: bye.id, name: bye.name, isChampion: bye.is_champion } : null,
  };
}

// Standings ranked by season points (ties broken by name). Reads the derived view.
export async function getStandings(): Promise<StandingRow[]> {
  const db = supabaseServer();
  const { data } = await db.from("standings").select("*");
  type Row = {
    team_id: string; name: string; is_champion: boolean;
    season_points: number; points_from_play: number; wins: number;
  };
  return ((data ?? []) as Row[])
    .map((r) => ({
      teamId: r.team_id,
      name: r.name,
      isChampion: r.is_champion,
      seasonPoints: Number(r.season_points),
      pointsFromPlay: Number(r.points_from_play),
      wins: Number(r.wins),
    }))
    .sort((a, b) => b.seasonPoints - a.seasonPoints || a.name.localeCompare(b.name));
}
