"use client";
import { useState, useTransition } from "react";
import { addMember } from "../actions";
import type { Team } from "@/lib/draft";
import { PlusIcon } from "./Icons";

// Owner-only: add a person to a team after the draft (someone who missed it).
// Creates the player and appends them to the chosen team's roster.
export default function AddMemberForm({ teams }: { teams: Team[] }) {
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "");
  const [name, setName] = useState("");
  const [year, setYear] = useState("");
  const [major, setMajor] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const submit = () => {
    setError(undefined);
    setDone(undefined);
    start(async () => {
      const res = await addMember(name, year, major, teamId);
      if (res.error) { setError(res.error); return; }
      const team = teams.find((t) => t.id === teamId)?.name ?? "the team";
      setDone(`Added ${name.trim()} to ${team}.`);
      setName(""); setYear(""); setMajor("");
    });
  };

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        Add a brother who missed the draft. They join the chosen team&apos;s roster and start
        counting toward its scoring immediately.
      </p>
      <div className="row" style={{ alignItems: "flex-end", flexWrap: "wrap" }}>
        <div className="field" style={{ flex: "1 1 12rem" }}>
          <label htmlFor="m-name">Name</label>
          <input id="m-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="field" style={{ flex: "1 1 8rem" }}>
          <label htmlFor="m-year">Year</label>
          <input id="m-year" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Optional" />
        </div>
        <div className="field" style={{ flex: "1 1 10rem" }}>
          <label htmlFor="m-major">Major</label>
          <input id="m-major" value={major} onChange={(e) => setMajor(e.target.value)} placeholder="Optional" />
        </div>
        <div className="field" style={{ flex: "1 1 10rem" }}>
          <label htmlFor="m-team">Team</label>
          <select id="m-team" value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-primary" onClick={submit} disabled={pending || !name.trim()}>
          <PlusIcon size={15} /> {pending ? "Adding…" : "Add member"}
        </button>
      </div>
      {done && <p className="badge badge-ok" style={{ alignSelf: "start" }}>{done}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
