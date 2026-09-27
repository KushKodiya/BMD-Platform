"use client";
import { useMemo, useState, useTransition } from "react";
import { addScore, deleteScore } from "../actions";
import { WEEKLY_ACTIVITIES, SEASON_ACTIVITIES } from "@/lib/scoring.mjs";
import { weekRangeLabel } from "@/lib/week.mjs";
import PlayerCombobox from "./PlayerCombobox";
import { PlusIcon, XIcon } from "./Icons";

export type RecentEntry = {
  id: string;
  playerName: string;
  categoryLabel: string;
  week: number | null;
  points: number;
};

type Player = { id: string; name: string };
type Activity = { key: string; label: string; category: string; points: number };

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

// Moderator entry surface. Two modes: weekly matchup points and exam/IM points
// (season-direct, no week). Weekly points can only be logged for the one week
// open right now (openWeek); exam/IM points are always open. Picking an activity
// pre-fills its point value, which the moderator can still override.
export default function ScoreEntryForm({
  players, weeks, openWeek, isOwner, recent,
}: {
  players: Player[];
  weeks: number[];
  openWeek: number | null;
  isOwner: boolean;
  recent: RecentEntry[];
}) {
  const [mode, setMode] = useState<"weekly" | "season">("weekly");
  const activities: Activity[] = mode === "weekly" ? WEEKLY_ACTIVITIES : SEASON_ACTIVITIES;

  const [playerId, setPlayerId] = useState("");
  const [activityKey, setActivityKey] = useState(activities[0].key);
  const [points, setPoints] = useState(String(activities[0].points));
  // Owner-only: enter weekly points into any scheduled week, including closed ones.
  const [override, setOverride] = useState(false);
  const [overrideWeek, setOverrideWeek] = useState(weeks[0]);
  const [error, setError] = useState<string | undefined>();
  const [pending, start] = useTransition();

  // The week a weekly entry targets: the override pick, else the live open week.
  const targetWeek = override ? overrideWeek : openWeek;
  const weekClosed = mode === "weekly" && !override && openWeek == null;

  const activity = useMemo(
    () => activities.find((a) => a.key === activityKey) ?? activities[0],
    [activities, activityKey],
  );

  const switchMode = (m: "weekly" | "season") => {
    setMode(m);
    const first = (m === "weekly" ? WEEKLY_ACTIVITIES : SEASON_ACTIVITIES)[0];
    setActivityKey(first.key);
    setPoints(String(first.points));
    setError(undefined);
  };

  const pickActivity = (key: string) => {
    setActivityKey(key);
    const a = activities.find((x) => x.key === key);
    if (a) setPoints(String(a.points));
  };

  const submit = () => {
    setError(undefined);
    const value = Number(points);
    const week = mode === "weekly" ? targetWeek : null;
    start(async () => {
      const res = await addScore(playerId, activity.category, value, week, mode === "weekly" && override);
      if (res.error) setError(res.error);
      else setPoints(String(activity.points)); // reset for the next quick entry
    });
  };

  const remove = (id: string) => start(async () => setError((await deleteScore(id)).error));

  return (
    <div className="stack" style={{ gap: "1.25rem" }}>
      <div className="card stack" style={{ gap: "0.9rem" }}>
        <div className="row" style={{ gap: "0.5rem" }}>
          <button
            type="button"
            className={mode === "weekly" ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
            onClick={() => switchMode("weekly")}
          >
            Weekly points
          </button>
          <button
            type="button"
            className={mode === "season" ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
            onClick={() => switchMode("season")}
          >
            Exam / IM points
          </button>

          {isOwner && mode === "weekly" && (
            <label className="override-toggle">
              <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
              Override a closed week
            </label>
          )}
        </div>

        <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ flex: "1 1 14rem" }}>
            <label>Player</label>
            <PlayerCombobox players={players} value={playerId} onSelect={setPlayerId} />
          </div>

          <div className="field" style={{ flex: "1 1 12rem" }}>
            <label htmlFor="s-activity">Activity</label>
            <select id="s-activity" value={activityKey} onChange={(e) => pickActivity(e.target.value)}>
              {activities.map((a) => (
                <option key={a.key} value={a.key}>{a.label} ({fmt(a.points)})</option>
              ))}
            </select>
          </div>

          {mode === "weekly" && (
            <div className="field" style={{ flex: "1 1 10rem" }}>
              <label htmlFor={override ? "s-owk" : undefined}>{override ? "Override week" : "Open week"}</label>
              {override ? (
                <select id="s-owk" value={overrideWeek} onChange={(e) => setOverrideWeek(Number(e.target.value))}>
                  {weeks.map((w) => (
                    <option key={w} value={w}>Week {w} · {weekRangeLabel(w)}</option>
                  ))}
                </select>
              ) : (
                <div className="week-locked">
                  {openWeek != null
                    ? `Week ${openWeek} · ${weekRangeLabel(openWeek)}`
                    : "No week is open right now"}
                </div>
              )}
            </div>
          )}

          <div className="field" style={{ flex: "0 1 6rem" }}>
            <label htmlFor="s-points">Points</label>
            <input
              id="s-points"
              type="number"
              step="0.1"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
            />
          </div>

          <button
            type="button"
            className="btn-primary"
            onClick={submit}
            disabled={pending || !playerId || weekClosed}
          >
            <PlusIcon size={15} /> {pending ? "Saving…" : "Add points"}
          </button>
        </div>
        {weekClosed && (
          <p className="muted" style={{ margin: 0 }}>
            No week is open for weekly scoring right now. Weekly points can only be entered during
            the live week (Sunday–Saturday, Eastern). Exam/IM points can still be entered.
          </p>
        )}
        {error && <p className="error" role="alert">{error}</p>}
      </div>

      <div className="stack" style={{ gap: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>Recent entries</h2>
        {recent.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No entries yet.</p>
        ) : (
          <ul className="entry-list">
            {recent.map((e) => (
              <li key={e.id} className="entry-row">
                <span className="entry-name">{e.playerName}</span>
                <span className="dim">
                  {e.categoryLabel}{e.week != null ? ` · Wk ${e.week}` : ""}
                </span>
                <span className="entry-pts">+{fmt(e.points)}</span>
                <button
                  type="button"
                  className="btn-ghost btn-icon"
                  onClick={() => remove(e.id)}
                  disabled={pending}
                  aria-label={`Remove ${e.playerName} ${e.categoryLabel} entry`}
                >
                  <XIcon size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
