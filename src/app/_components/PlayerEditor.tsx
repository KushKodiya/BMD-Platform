"use client";
import { useState, useTransition } from "react";
import { updatePlayer } from "../actions";
import PlayerCombobox from "./PlayerCombobox";
import { CheckIcon } from "./Icons";

type PlayerRec = { id: string; name: string; year: string; teamId: string | null };
type Team = { id: string; name: string };

// Owner-only: search a player and correct their name, year, or team. A team
// change moves their roster pick (see owner_update_player).
export default function PlayerEditor({ players, teams }: { players: PlayerRec[]; teams: Team[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const select = (id: string) => {
    setSelectedId(id);
    setError(undefined);
    setDone(undefined);
    const p = players.find((x) => x.id === id);
    setName(p?.name ?? "");
    setYear(p?.year ?? "");
    setTeamId(p?.teamId ?? "");
  };

  const save = () => {
    setError(undefined);
    setDone(undefined);
    start(async () => {
      const res = await updatePlayer(selectedId, name, year, teamId);
      if (res.error) setError(res.error);
      else setDone(`Saved ${name.trim()}.`);
    });
  };

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        Search a player to correct their name, year, or team. Changing the team moves them onto
        that roster.
      </p>

      <div className="field" style={{ maxWidth: "18rem" }}>
        <label>Player</label>
        <PlayerCombobox players={players} value={selectedId} onSelect={select} />
      </div>

      {selectedId && (
        <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ flex: "1 1 12rem" }}>
            <label htmlFor="e-name">Name</label>
            <input id="e-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field" style={{ flex: "1 1 8rem" }}>
            <label htmlFor="e-year">Year</label>
            <input id="e-year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Optional" />
          </div>
          <div className="field" style={{ flex: "1 1 10rem" }}>
            <label htmlFor="e-team">Team</label>
            <select id="e-team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">— no team —</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <button type="button" className="btn-primary" onClick={save} disabled={pending || !name.trim()}>
            <CheckIcon size={15} /> {pending ? "Saving…" : "Save"}
          </button>
        </div>
      )}

      {done && <p className="badge badge-ok" style={{ alignSelf: "start" }}>{done}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
