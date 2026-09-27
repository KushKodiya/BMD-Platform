"use client";
import { useState, useTransition } from "react";
import { setModAccess } from "../actions";

type Moderator = { id: string; email: string };
type Team = { id: string; name: string };
type Access = { moderator_id: string; team_id: string };

// Owner-only: pick a moderator, then toggle which teams they may score. Each
// toggle grants/revokes access for that mod + team; the scoring RPCs enforce it.
export default function ModeratorSettings({
  moderators, teams, access,
}: {
  moderators: Moderator[];
  teams: Team[];
  access: Access[];
}) {
  const [modId, setModId] = useState(moderators[0]?.id ?? "");
  // Local grant set keyed "mod:team" for optimistic toggles.
  const [granted, setGranted] = useState<Set<string>>(
    () => new Set(access.map((a) => `${a.moderator_id}:${a.team_id}`)),
  );
  const [error, setError] = useState<string | undefined>();
  const [, start] = useTransition();

  if (moderators.length === 0) {
    return (
      <p className="muted" style={{ margin: 0 }}>
        No moderator accounts yet. Create them with <code>scripts/setup-moderators.mjs</code>.
      </p>
    );
  }

  const key = (team: string) => `${modId}:${team}`;
  const toggle = (teamId: string) => {
    const k = key(teamId);
    const enabled = !granted.has(k);
    setGranted((prev) => {
      const next = new Set(prev);
      if (enabled) next.add(k); else next.delete(k);
      return next;
    });
    setError(undefined);
    start(async () => {
      const res = await setModAccess(modId, teamId, enabled);
      if (res.error) {
        setError(res.error);
        // roll back the optimistic change
        setGranted((prev) => {
          const next = new Set(prev);
          if (enabled) next.delete(k); else next.add(k);
          return next;
        });
      }
    });
  };

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        Choose a moderator, then enable the teams whose players they may add or remove points for.
      </p>

      <div className="field" style={{ maxWidth: "20rem" }}>
        <label htmlFor="mod-select">Moderator</label>
        <select id="mod-select" value={modId} onChange={(e) => setModId(e.target.value)}>
          {moderators.map((m) => (
            <option key={m.id} value={m.id}>{m.email}</option>
          ))}
        </select>
      </div>

      <ul className="order-list">
        {teams.map((t) => {
          const on = granted.has(key(t.id));
          return (
            <li key={t.id} className="order-item">
              <span className="order-name">{t.name}</span>
              <label className="switch" style={{ marginLeft: "auto" }}>
                <input type="checkbox" checked={on} onChange={() => toggle(t.id)} />
                <span className="switch-track" aria-hidden="true" />
                <span className="sr-only">
                  {on ? `Revoke access to ${t.name}` : `Grant access to ${t.name}`}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
