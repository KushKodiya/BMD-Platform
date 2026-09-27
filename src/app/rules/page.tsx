import { BookIcon } from "../_components/Icons";

// Static rules reference. Scoring values come from the league's scoring sheet.
const SCORING: { activity: string; points: number }[] = [
  { activity: "A on Exam", points: 2 },
  { activity: "B on Exam", points: 1 },
  { activity: "Office Hours/job related to your career", points: 0.4 },
  { activity: "Studying with brother(s)", points: 0.2 },
  { activity: "Workout", points: 0.2 },
  { activity: "IM Sport Enrollment", points: 3 },
];

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
              {SCORING.map((row) => (
                <tr key={row.activity}>
                  <td style={{ textAlign: "left" }}>{row.activity}</td>
                  <td><strong>{row.points}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
