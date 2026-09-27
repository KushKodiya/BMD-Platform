"use client";
import { useMemo, useState } from "react";
import type { PlayerSeason } from "@/lib/season";
import { SearchIcon } from "./Icons";

const fmt = (n: number) => n.toFixed(1);

// Public player directory: search by name, ranked by season total (the list
// arrives pre-sorted from getPlayers). Rank reflects the full standing, not the
// filtered view, so searching a player still shows where they place.
export default function PlayersSearch({ players }: { players: PlayerSeason[] }) {
  const [query, setQuery] = useState("");
  const ranked = useMemo(() => players.map((p, i) => ({ ...p, rank: i + 1 })), [players]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? ranked.filter((p) => p.name.toLowerCase().includes(q)) : ranked;
  }, [ranked, query]);

  return (
    <div className="stack">
      <div className="search-wrap" style={{ maxWidth: "24rem" }}>
        <SearchIcon size={15} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players"
          aria-label="Search players"
        />
      </div>

      {matches.length > 0 ? (
        <div className="grid-wrap">
          <table>
            <caption className="sr-only">Players by season points.</caption>
            <thead>
              <tr>
                <th scope="col" className="col-round">#</th>
                <th scope="col" style={{ textAlign: "left" }}>Player</th>
                <th scope="col">Weekly avg</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((p) => (
                <tr key={p.playerId}>
                  <th scope="row" className="col-round">{p.rank}</th>
                  <td style={{ textAlign: "left" }}>
                    {p.name}
                    {p.teamName && <span className="player-team"> {p.teamName}</span>}
                  </td>
                  <td className="dim">{fmt(p.weeklyAverage)}</td>
                  <td><strong>{fmt(p.totalPoints)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted">No player matches “{query}”.</p>
      )}
    </div>
  );
}
