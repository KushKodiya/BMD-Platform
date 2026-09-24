import { getSchedule } from "@/lib/season";
import WeekPager from "../_components/WeekPager";
import { CalendarIcon } from "../_components/Icons";

export const dynamic = "force-dynamic";

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const schedule = await getSchedule();

  if (schedule.length === 0) {
    return (
      <>
        <header className="section" style={{ marginTop: "0.5rem" }}>
          <p className="eyebrow"><CalendarIcon size={13} /> Season</p>
          <h1 className="display-gradient">Schedule</h1>
        </header>
        <div className="empty section" style={{ marginTop: "1.25rem" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>The season schedule hasn&apos;t been generated yet.</p>
          <p className="dim" style={{ margin: 0 }}>It appears here once the owner generates it after the draft.</p>
        </div>
      </>
    );
  }

  const weeks = schedule.map((w) => w.week);
  const requested = Number(searchParams.week);
  const week = weeks.includes(requested) ? requested : weeks[0];
  const current = schedule.find((w) => w.week === week)!;

  return (
    <>
      <header className="section" style={{ marginTop: "0.5rem" }}>
        <p className="eyebrow"><CalendarIcon size={13} /> Season</p>
        <h1 className="display-gradient">Schedule</h1>
      </header>

      <div className="section" style={{ marginTop: "1rem" }}>
        <WeekPager base="/schedule" week={week} weeks={weeks} />
      </div>

      <section className="section">
        <ul className="matchup-list">
          {current.games.map((g, i) => (
            <li key={i} className="card schedule-row reveal" style={{ ["--i" as string]: i }}>
              <span className="schedule-team">{g.home}</span>
              <span className="schedule-vs">vs</span>
              <span className="schedule-team schedule-team-right">{g.away}</span>
            </li>
          ))}
        </ul>

        {current.bye && (
          <p className="muted" style={{ marginTop: "0.9rem" }}>
            <span className="badge badge-soft">Bye</span> {current.bye} is on a bye this week.
          </p>
        )}
      </section>
    </>
  );
}
