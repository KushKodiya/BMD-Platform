import { getSeasonMeta, getStandings } from "@/lib/season";
import { ChartIcon, CrownIcon } from "../_components/Icons";

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toFixed(1);

export default async function StandingsPage() {
  const [{ weeks }, standings] = await Promise.all([getSeasonMeta(), getStandings()]);

  if (weeks.length === 0) {
    return (
      <>
        <header className="section" style={{ marginTop: "0.5rem" }}>
          <p className="eyebrow"><ChartIcon size={13} /> Season</p>
          <h1 className="display-gradient">Standings</h1>
        </header>
        <div className="empty section" style={{ marginTop: "1.25rem" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>No standings yet.</p>
          <p className="dim" style={{ margin: 0 }}>They fill in once the season schedule is generated and weeks are scored.</p>
        </div>
      </>
    );
  }

  return (
    <>
      <header className="section" style={{ marginTop: "0.5rem" }}>
        <p className="eyebrow"><ChartIcon size={13} /> Season</p>
        <h1 className="display-gradient">Standings</h1>
        <p className="muted" style={{ margin: 0 }}>
          Season points = sum of weekly averages + 25 per week won. Updates live as scores come in.
        </p>
      </header>

      <section className="section" style={{ marginTop: "1rem" }}>
        <div className="grid-wrap">
          <table>
            <caption className="sr-only">Standings by season points.</caption>
            <thead>
              <tr>
                <th scope="col" className="col-round">#</th>
                <th scope="col" style={{ textAlign: "left" }}>Team</th>
                <th scope="col">Wins</th>
                <th scope="col">From play</th>
                <th scope="col">Points</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((row, i) => (
                <tr key={row.teamId} className={row.isChampion ? "champion" : ""}>
                  <th scope="row" className="col-round">{i + 1}</th>
                  <td style={{ textAlign: "left" }}>
                    <span className={row.isChampion ? "champion-text" : ""}>
                      {row.isChampion && (
                        <>
                          <CrownIcon size={13} className="crown" />
                          <span className="sr-only">Defending champion: </span>
                        </>
                      )}
                      {row.name}
                    </span>
                  </td>
                  <td>{row.wins}</td>
                  <td className="dim">{fmt(row.pointsFromPlay)}</td>
                  <td><strong>{fmt(row.seasonPoints)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
