"use client";
import { useRef, useState } from "react";
import type { Matchup } from "@/lib/season";
import { ChevronLeftIcon, ChevronRightIcon, CrownIcon } from "./Icons";

const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(1));

function ChampionMark({ isChampion }: { isChampion: boolean }) {
  if (!isChampion) return null;
  return <CrownIcon size={13} className="crown" />;
}

/** One matchup per view, cycling circularly via buttons, arrow keys, or swipe.
 *  Head-to-head layout: team totals up top, then each ranked slot's home player
 *  faced against the away player in the same slot. */
export default function MatchupCarousel({
  matchups,
  winBonus,
}: {
  matchups: Matchup[];
  winBonus: number;
}) {
  const [i, setI] = useState(0);
  const n = matchups.length;
  const go = (d: number) => setI((prev) => (prev + d + n) % n); // wrap both ways
  const touchX = useRef<number | null>(null);

  const m = matchups[i];
  const homeWon = m.winnerTeamId === m.home.teamId;
  const awayWon = m.winnerTeamId === m.away.teamId;
  const rows = Math.max(m.home.players.length, m.away.players.length);

  return (
    <div
      className="h2h"
      role="group"
      aria-roledescription="carousel"
      aria-label={`Matchup ${i + 1} of ${n}`}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        else if (e.key === "ArrowLeft") go(-1);
      }}
      onTouchStart={(e) => (touchX.current = e.changedTouches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); // swipe left -> next
        touchX.current = null;
      }}
    >
      <article className="card h2h-card">
        <div className="h2h-head">
          <div className={"h2h-team" + (homeWon ? " is-winner" : "")}>
            <span className="h2h-team-name"><ChampionMark isChampion={m.home.isChampion} />{m.home.name}</span>
            <span className="h2h-team-total">{fmt(m.home.total)}</span>
          </div>
          <span className="h2h-vs" aria-hidden="true">vs</span>
          <div className={"h2h-team h2h-team-right" + (awayWon ? " is-winner" : "")}>
            <span className="h2h-team-total">{fmt(m.away.total)}</span>
            <span className="h2h-team-name"><ChampionMark isChampion={m.away.isChampion} />{m.away.name}</span>
          </div>
        </div>

        {rows > 0 ? (
          <div className="h2h-rows">
            {Array.from({ length: rows }, (_, r) => {
              const hp = m.home.players[r];
              const ap = m.away.players[r];
              return (
                <div key={r} className="h2h-row">
                  <span className="h2h-name left">{hp?.name ?? ""}</span>
                  <span className="h2h-pts left">{hp ? fmt(hp.points) : ""}</span>
                  <span className="h2h-slot">{r + 1}</span>
                  <span className="h2h-pts right">{ap ? fmt(ap.points) : ""}</span>
                  <span className="h2h-name right">{ap?.name ?? ""}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="roster-empty">Scores post once this week is opened.</p>
        )}

        {m.winnerTeamId && (
          <div className="matchup-result">
            {(homeWon ? m.home.name : m.away.name)} wins <span className="matchup-bonus">+{winBonus}</span>
          </div>
        )}
      </article>

      <div className="h2h-nav">
        <button className="btn-ghost btn-icon" onClick={() => go(-1)} aria-label="Previous matchup">
          <ChevronLeftIcon size={18} />
        </button>
        <div className="h2h-dots" role="tablist" aria-label="Matchups">
          {matchups.map((_, d) => (
            <button
              key={d}
              className={"h2h-dot" + (d === i ? " is-active" : "")}
              aria-label={`Matchup ${d + 1}`}
              aria-selected={d === i}
              role="tab"
              onClick={() => setI(d)}
            />
          ))}
        </div>
        <button className="btn-ghost btn-icon" onClick={() => go(1)} aria-label="Next matchup">
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </div>
  );
}
