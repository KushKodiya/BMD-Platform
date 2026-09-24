"use client";
import { useMemo, useState, useTransition } from "react";
import { replaceRosterPlayer } from "../actions";
import type { Player, Team } from "@/lib/draft";
import { SearchIcon, ShuffleIcon, XIcon } from "./Icons";

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

const sub = (p: Player) => [p.year_in_school, p.major].filter(Boolean).join(" · ");

type Props = {
  teams: Team[];                         // in draft order
  rosters: Record<string, Player[]>;
  available: Player[];                   // undrafted pool
};

/**
 * Owner-only roster corrections. Always framed as "replace X with Y", because
 * that is exactly what the RPC does: Y takes X's pick slot. If Y is already on
 * a roster the two swap; otherwise X returns to the pool.
 *
 * Slots never move, so the board stays rectangular and no team gains or loses
 * a pick -- which is also why there is no bare "remove" here. Dropping someone
 * is replacing them with a player from the pool.
 */
export default function RosterEditor({ teams, rosters, available }: Props) {
  const [teamId, setTeamId] = useState<string>(teams[0]?.id ?? "");
  const [outPlayer, setOutPlayer] = useState<Player | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [done, setDone] = useState<string | undefined>();
  const [pending, start] = useTransition();

  const teamName = useMemo(
    () => new Map(teams.map((t) => [t.id, t.name])),
    [teams]
  );

  // Who each drafted player currently belongs to, so a swap can say so.
  const ownerOf = useMemo(() => {
    const m = new Map<string, string>();
    for (const [tid, roster] of Object.entries(rosters)) {
      for (const p of roster) m.set(p.id, tid);
    }
    return m;
  }, [rosters]);

  // Candidates: the whole pool, plus everyone on another team.
  const candidates = useMemo(() => {
    if (!outPlayer) return [];
    const drafted = Object.entries(rosters)
      .filter(([tid]) => tid !== teamId)
      .flatMap(([, roster]) => roster);
    const all = [...available, ...drafted].filter((p) => p.id !== outPlayer.id);
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((p) =>
      `${p.name} ${p.year_in_school ?? ""} ${p.major ?? ""}`.toLowerCase().includes(q)
    );
  }, [outPlayer, rosters, teamId, available, query]);

  const roster = rosters[teamId] ?? [];

  const apply = (inPlayer: Player) => {
    if (!outPlayer) return;
    setError(undefined);
    setDone(undefined);
    start(async () => {
      const res = await replaceRosterPlayer(outPlayer.id, inPlayer.id);
      if (res.error) {
        setError(res.error);
        return;
      }
      const landed = ownerOf.get(inPlayer.id);
      setDone(
        landed
          ? `Swapped ${outPlayer.name} with ${inPlayer.name} (${teamName.get(landed) ?? "another team"}).`
          : `${inPlayer.name} replaced ${outPlayer.name}, who is back in the pool.`
      );
      setOutPlayer(null);
      setQuery("");
    });
  };

  if (teams.length === 0) {
    return <p className="muted">Rosters appear once the draft order is set.</p>;
  }

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        Replacing a player puts the new one in the same pick slot, so no team gains
        or loses a pick. Pick someone already on another roster and the two swap
        teams; pick someone from the pool and the player you replaced returns to it.
      </p>

      <div className="field" style={{ maxWidth: "20rem" }}>
        <label htmlFor="roster-team">Team</label>
        <select
          id="roster-team"
          value={teamId}
          onChange={(e) => { setTeamId(e.target.value); setOutPlayer(null); setDone(undefined); }}
          disabled={pending}
        >
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {roster.length === 0 ? (
        <p className="muted">{teamName.get(teamId)} hasn&apos;t drafted anyone yet.</p>
      ) : (
        <ul className="player-grid">
          {roster.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="player-row"
                aria-pressed={outPlayer?.id === p.id}
                disabled={pending}
                onClick={() => {
                  setOutPlayer(outPlayer?.id === p.id ? null : p);
                  setQuery("");
                  setDone(undefined);
                }}
              >
                <span className="player-avatar" aria-hidden="true">{initials(p.name)}</span>
                <span className="player-meta">
                  <span className="player-name">{p.name}</span>
                  {sub(p) && <span className="player-sub">{sub(p)}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {outPlayer && (
        <div className="card" style={{ padding: "1rem" }}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <strong>
              <ShuffleIcon size={15} /> Replace {outPlayer.name} with…
            </strong>
            <button
              type="button"
              className="btn-ghost btn-sm"
              onClick={() => setOutPlayer(null)}
              disabled={pending}
            >
              <XIcon size={14} /> Cancel
            </button>
          </div>

          <div className="search-wrap" style={{ margin: "0.75rem 0", maxWidth: "24rem" }}>
            <SearchIcon size={15} />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search the pool and other rosters"
              aria-label="Search for a replacement"
              disabled={pending}
            />
          </div>

          {candidates.length > 0 ? (
            <ul className="player-grid scroll-list">
              {candidates.map((p) => {
                const heldBy = ownerOf.get(p.id);
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="player-row"
                      disabled={pending}
                      onClick={() => apply(p)}
                    >
                      <span className="player-avatar" aria-hidden="true">{initials(p.name)}</span>
                      <span className="player-meta">
                        <span className="player-name">{p.name}</span>
                        <span className="player-sub">
                          {heldBy ? `swap with ${teamName.get(heldBy)}` : "from the pool"}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Nobody matches “{query}”.</p>
          )}
        </div>
      )}

      {done && <p className="badge badge-ok" style={{ alignSelf: "start" }}>{done}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
