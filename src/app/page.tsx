import { getBoardState, getUserContext, getPublicTrades } from "@/lib/draft";
import { describeLimit } from "@/lib/clock.mjs";
import PickForm from "./_components/PickForm";
import OnTheClock from "./_components/OnTheClock";
import AvailablePlayers from "./_components/AvailablePlayers";
import { ClockIcon, ListIcon, ShuffleIcon, TrophyIcon, UsersIcon } from "./_components/Icons";

export const dynamic = "force-dynamic";

export default async function BoardPage() {
  const board = await getBoardState();
  const { myTeamId } = await getUserContext();
  const { draft, orderedTeams, rosters, available, grid, onClockTeamId, teams, players } = board;
  const { autoPickedIds, deadline, serverNow } = board;

  const trades = await getPublicTrades(teams, players);

  const teamName = (id: string | null) => teams.find((t) => t.id === id)?.name ?? "—";
  const isMyTurn = !!myTeamId && myTeamId === onClockTeamId;
  const teamCount = orderedTeams.length || teams.length || 1;
  const round = Math.floor(draft.pick_count / teamCount) + 1;
  const tradeTime = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString("en-US", {
          month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
        })
      : "";

  return (
    <>
      <header className="section" style={{ marginTop: "0.5rem" }}>
        <p className="eyebrow">Sigma Phi Epsilon · Indiana Alpha</p>
        <h1 className="display-gradient">Balanced Man Draft</h1>
        <div className="row">
          {draft.status === "in_progress" && (
            <span className="badge badge-live"><span className="dot" /> Live</span>
          )}
          {draft.status === "setup" && <span className="badge badge-soft">Setup</span>}
          {draft.status === "complete" && (
            <span className="badge badge-ok"><TrophyIcon size={12} /> Complete</span>
          )}
          <span className="muted">
            <ClockIcon size={13} /> {describeLimit(draft.pick_seconds)}
            {draft.pick_seconds != null && " per pick"}
          </span>
        </div>
      </header>

      {/* --- Current turn ---------------------------------------------- */}
      {draft.status === "in_progress" && onClockTeamId && (
        <div className="section" style={{ marginTop: "1.25rem" }}>
          <OnTheClock
            teamName={teamName(onClockTeamId)}
            round={round}
            pickNumber={draft.pick_count + 1}
            totalPicks={players.length}
            deadline={deadline}
            serverNow={serverNow}
            pickSeconds={draft.pick_seconds}
            pickIndex={draft.pick_count}
            isMyTurn={isMyTurn}
          >
            {isMyTurn && available.length > 0 && <PickForm available={available} />}
          </OnTheClock>
        </div>
      )}

      {draft.status === "complete" && (
        <div className="card pop section" style={{ marginTop: "1.25rem", textAlign: "center" }}>
          <p className="eyebrow">That&apos;s a wrap</p>
          <h2 className="display-gradient" style={{ marginBottom: "0.2rem" }}>
            The draft is complete
          </h2>
          <p className="muted" style={{ margin: 0 }}>
            All {players.length} players are on a team. Final rosters are below.
          </p>
        </div>
      )}

      {draft.status === "setup" && (
        <div className="empty section" style={{ marginTop: "1.25rem" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>The draft hasn&apos;t started yet.</p>
          <p className="dim" style={{ margin: 0 }}>
            The owner is still setting the pool, the order, and the pick clock.
          </p>
        </div>
      )}

      {/* --- Stats ------------------------------------------------------ */}
      <div className="stat-grid section">
        <div className="stat">
          <div className="stat-value">{draft.pick_count}</div>
          <div className="stat-label">Picks made</div>
        </div>
        <div className="stat">
          <div className="stat-value">{available.length}</div>
          <div className="stat-label">Still available</div>
        </div>
        <div className="stat">
          <div className="stat-value">{teamCount}</div>
          <div className="stat-label">Teams</div>
        </div>
        <div className="stat">
          <div className="stat-value">{autoPickedIds.size}</div>
          <div className="stat-label">Clock picks</div>
        </div>
      </div>

      {/* --- Board ------------------------------------------------------ */}
      <section className="section">
        <div className="section-head">
          <h2><ListIcon size={20} /> Draft board</h2>
          {autoPickedIds.size > 0 && (
            <span className="dim">
              <ClockIcon size={12} /> marks a player assigned by the clock
            </span>
          )}
        </div>

        {orderedTeams.length > 0 ? (
          <div className="grid-wrap">
            <table>
              <caption className="sr-only">
                Draft board by round. Each column is a team in draft order.
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="col-round">Rd</th>
                  {orderedTeams.map((t) => (
                    <th
                      key={t.id}
                      scope="col"
                      className={t.id === onClockTeamId ? "on-clock" : ""}
                    >
                      {t.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.map((row, r) => (
                  <tr key={r}>
                    <th scope="row" className="col-round">{r + 1}</th>
                    {row.map((cell, c) => {
                      const auto = cell ? autoPickedIds.has(cell.id) : false;
                      const live = orderedTeams[c]?.id === onClockTeamId;
                      return (
                        <td
                          key={c}
                          className={[auto ? "auto-pick" : "", live ? "on-clock-col" : ""]
                            .filter(Boolean).join(" ")}
                        >
                          {cell ? (
                            <>
                              {cell.name}
                              {auto && (
                                <span className="auto-flag" title="Assigned by the clock">
                                  <ClockIcon size={12} />
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="cell-empty">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <p style={{ margin: 0 }}>The draft order hasn&apos;t been set yet.</p>
          </div>
        )}
      </section>

      {/* --- Rosters ----------------------------------------------------- */}
      <section className="section">
        <div className="section-head">
          <h2><UsersIcon size={20} /> Rosters</h2>
        </div>
        {orderedTeams.length > 0 ? (
          <div className="roster-grid">
            {orderedTeams.map((t, i) => {
              const roster = rosters[t.id] ?? [];
              return (
                <article
                  key={t.id}
                  className={`card card-hover roster-card reveal${t.id === onClockTeamId ? " is-on-clock" : ""}`}
                  style={{ ["--i" as string]: i }}
                >
                  <div className="roster-head">
                    <span className="roster-seed" aria-hidden="true">{i + 1}</span>
                    <span className="roster-name">{t.name}</span>
                    {t.id === onClockTeamId && (
                      <span className="badge badge-live" style={{ marginLeft: "auto" }}>
                        <span className="dot" /> Now
                      </span>
                    )}
                    {t.id === myTeamId && t.id !== onClockTeamId && (
                      <span className="badge badge-soft" style={{ marginLeft: "auto" }}>You</span>
                    )}
                  </div>
                  {roster.length > 0 ? (
                    <ol className="roster-list">
                      {roster.map((p, n) => (
                        <li key={p.id} className={autoPickedIds.has(p.id) ? "auto-pick" : ""}>
                          <span className="num">{n + 1}</span>
                          <span>{p.name}</span>
                          {autoPickedIds.has(p.id) && (
                            <span className="auto-flag" title="Assigned by the clock">
                              <ClockIcon size={12} />
                            </span>
                          )}
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="roster-empty">No picks yet.</p>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty"><p style={{ margin: 0 }}>Teams appear once the order is set.</p></div>
        )}
      </section>

      {/* --- Trade log --------------------------------------------------- */}
      {trades.length > 0 && (
        <section className="section">
          <div className="section-head">
            <h2><ShuffleIcon size={20} /> Trade log</h2>
            <span className="badge badge-soft">{trades.length}</span>
          </div>
          <ul className="trade-log">
            {trades.map((t) => (
              <li key={t.id} className="card">
                <span className="trade-log-desc">
                  <strong>{t.fromTeam}</strong> sent {t.fromPlayers.join(", ")} to{" "}
                  <strong>{t.toTeam}</strong> for {t.toPlayers.join(", ")}
                </span>
                <time className="muted trade-log-time">{tradeTime(t.resolvedAt)}</time>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* --- Pool -------------------------------------------------------- */}
      <section className="section">
        <div className="section-head">
          <h2>Available players</h2>
          <span className="badge badge-soft">{available.length} left</span>
        </div>
        <AvailablePlayers players={available} />
      </section>
    </>
  );
}
