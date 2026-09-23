"use client";
import { useState, useTransition } from "react";
import { setChampionTeam } from "../actions";
import type { Team } from "@/lib/draft";
import { CheckIcon, CrownIcon } from "./Icons";

const NONE = "none";

/**
 * Owner picks last semester's winner, who is shown in gold across the board.
 * A flag rather than a name match, so the gold survives a team rename -- move
 * it here at the end of each semester instead of editing SQL.
 */
export default function ChampionPicker({ teams, current }: { teams: Team[]; current: string | null }) {
  const [choice, setChoice] = useState<string>(current ?? NONE);
  const [error, setError] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  const save = () => {
    setSaved(false);
    start(async () => {
      const res = await setChampionTeam(choice === NONE ? null : choice);
      setError(res.error);
      setSaved(!res.error);
    });
  };

  const championName = teams.find((t) => t.id === current)?.name;

  return (
    <div className="stack">
      <p className="row" style={{ margin: 0 }}>
        {championName ? (
          <span className="badge badge-champion"><CrownIcon size={12} /> {championName}</span>
        ) : (
          <span className="badge badge-soft">No champion set</span>
        )}
        <span className="muted">
          Shown in gold on the board, the rosters, and the clock when they&apos;re picking.
        </span>
      </p>

      <div className="row" style={{ alignItems: "flex-end" }}>
        <div className="field" style={{ flex: "1 1 14rem", maxWidth: "20rem" }}>
          <label htmlFor="champion-team">Defending champion</label>
          <select
            id="champion-team"
            value={choice}
            onChange={(e) => { setChoice(e.target.value); setSaved(false); }}
            disabled={pending}
          >
            <option value={NONE}>Nobody</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-primary" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save champion"}
        </button>
        {saved && !pending && (
          <span className="badge badge-ok"><CheckIcon size={12} /> Saved</span>
        )}
      </div>

      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
