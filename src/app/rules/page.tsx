import { ACTIVITIES } from "@/lib/scoring.mjs";
import { BookIcon } from "../_components/Icons";

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function RulesPage() {
  return (
    <>
      <header className="section" style={{ marginTop: "0.5rem" }}>
        <p className="eyebrow"><BookIcon size={13} /> League</p>
        <h1 className="display-gradient">Rules</h1>
      </header>

      <section className="section" style={{ marginTop: "1rem" }}>
        <h2 style={{ marginBottom: "0.6rem" }}>Scoring rules</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Points earned per activity.
        </p>
        <div className="grid-wrap">
          <table>
            <caption className="sr-only">Points earned per activity.</caption>
            <thead>
              <tr>
                <th scope="col" style={{ textAlign: "left" }}>Activity</th>
                <th scope="col">Points</th>
              </tr>
            </thead>
            <tbody>
              {ACTIVITIES.map((row) => (
                <tr key={row.key}>
                  <td style={{ textAlign: "left" }}>{row.label}</td>
                  <td><strong>{fmt(row.points)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
