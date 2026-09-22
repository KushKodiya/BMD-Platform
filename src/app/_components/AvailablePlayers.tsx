"use client";
import { useMemo, useState } from "react";
import type { Player } from "@/lib/draft";
import { SearchIcon } from "./Icons";

const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");

/** Read-only pool browser for viewers and off-clock admins. */
export default function AvailablePlayers({ players }: { players: Player[] }) {
  const [query, setQuery] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return players;
    return players.filter((p) =>
      `${p.name} ${p.year_in_school ?? ""} ${p.major ?? ""}`.toLowerCase().includes(q)
    );
  }, [players, query]);

  if (players.length === 0) {
    return <div className="empty"><p style={{ margin: 0 }}>Every player has been drafted.</p></div>;
  }

  return (
    <div className="stack">
      <div className="search-wrap" style={{ maxWidth: "24rem" }}>
        <SearchIcon size={15} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search remaining players"
          aria-label="Search remaining players"
        />
      </div>

      {matches.length > 0 ? (
        <ul className="player-grid">
          {matches.map((p, i) => (
            <li key={p.id} className="player-row reveal" style={{ ["--i" as string]: i }}>
              <span className="player-avatar" aria-hidden="true">{initials(p.name)}</span>
              <span className="player-meta">
                <span className="player-name">{p.name}</span>
                {(p.year_in_school || p.major) && (
                  <span className="player-sub">
                    {[p.year_in_school, p.major].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">No one left in the pool matches “{query}”.</p>
      )}
    </div>
  );
}
