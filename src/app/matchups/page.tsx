import { getSeasonMeta, getWeekBoard, WIN_BONUS, type MatchupTeam } from "@/lib/season";
import WeekPager from "../_components/WeekPager";
import { CrownIcon, SwordsIcon } from "../_components/Icons";

export const dynamic = "force-dynamic";

const fmt = (n: number | null) => (n == null ? "—" : n.toFixed(1));

function ChampionMark({ team }: { team: { isChampion: boolean } }) {
  if (!team.isChampion) return null;
  return (
    <>
      <CrownIcon size={13} className="crown" />
      <span className="sr-only">Defending champion: </span>
    </>
  );
}

export default async function MatchupsPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const { weeks } = await getSeasonMeta();

  if (weeks.length === 0) {
    return (
      <>
        <header className="section" style={{ marginTop: "0.5rem" }}>
          <p className="eyebrow"><SwordsIcon size={13} /> Season</p>
          <h1 className="display-gradient">Matchups</h1>
        </header>
        <div className="empty section" style={{ marginTop: "1.25rem" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>No matchups yet.</p>
          <p className="dim" style={{ margin: 0 }}>They appear once the owner generates the season schedule.</p>
        </div>
      </>
    );
  }

  const requested = Number(searchParams.week);
  const week = weeks.includes(requested) ? requested : weeks[0];
  const board = (await getWeekBoard(week))!;

  const nameOf = (m: { home: MatchupTeam; away: MatchupTeam }, id: string | null) =>
    id === m.home.teamId ? m.home.name : id === m.away.teamId ? m.away.name : null;

  return (
    <>
      <header className="section" style={{ marginTop: "0.5rem" }}>
        <p className="eyebrow"><SwordsIcon size={13} /> Season</p>
        <h1 className="display-gradient">Matchups</h1>
      </header>

      <div className="section" style={{ marginTop: "1rem" }}>
        <WeekPager base="/matchups" week={week} weeks={weeks} />
        {!board.opened && (
          <p className="dim" style={{ marginTop: "0.6rem" }}>
            This week isn&apos;t open yet — scores post once the owner opens it.
          </p>
        )}
      </div>

      <section className="section">
        <div className="matchup-grid">
          {board.matchups.map((m, i) => {
            const homeWon = m.winnerTeamId === m.home.teamId;
            const awayWon = m.winnerTeamId === m.away.teamId;
            const winnerName = nameOf(m, m.winnerTeamId);
            const rows = Math.max(m.home.players.length, m.away.players.length);
            return (
              <article key={i} className="card matchup-card reveal" style={{ ["--i" as string]: i }}>
                <div className="matchup-head">
                  <div className={"matchup-team-head" + (homeWon ? " is-winner" : "")}>
                    <span className="matchup-team-name">
                      <ChampionMark team={m.home} />{m.home.name}
                    </span>
                    <span className="matchup-team-total">{fmt(m.home.total)}</span>
                  </div>
                  <span className="matchup-mid" aria-hidden="true">vs</span>
                  <div className={"matchup-team-head matchup-team-head-right" + (awayWon ? " is-winner" : "")}>
                    <span className="matchup-team-total">{fmt(m.away.total)}</span>
                    <span className="matchup-team-name">
                      <ChampionMark team={m.away} />{m.away.name}
                    </span>
                  </div>
                </div>

                {rows > 0 ? (
                  <div className="matchup-rosters">
                    <ol className="matchup-side">
                      {m.home.players.map((p) => (
                        <li key={p.id}>
                          <span className="mp-name">{p.name}</span>
                          <span className="mp-pts">{fmt(p.points)}</span>
                        </li>
                      ))}
                    </ol>
                    <ol className="matchup-side matchup-side-right">
                      {m.away.players.map((p) => (
                        <li key={p.id}>
                          <span className="mp-pts">{fmt(p.points)}</span>
                          <span className="mp-name">{p.name}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : (
                  <p className="roster-empty">Scores post once this week is opened.</p>
                )}

                {winnerName && (
                  <div className="matchup-result">
                    {winnerName} wins <span className="matchup-bonus">+{WIN_BONUS}</span>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        {board.byeTeam && (
          <p className="muted" style={{ marginTop: "0.9rem" }}>
            <span className="badge badge-soft">Bye</span>{" "}
            <ChampionMark team={board.byeTeam} />{board.byeTeam.name} is on a bye — no matchup, but their players still score toward the season.
          </p>
        )}
      </section>
    </>
  );
}
