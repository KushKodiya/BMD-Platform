import { getSeasonMeta, getWeekBoard, WIN_BONUS } from "@/lib/season";
import { defaultWeek } from "@/lib/week.mjs";
import WeekPager from "../_components/WeekPager";
import MatchupCarousel from "../_components/MatchupCarousel";
import { CrownIcon, SwordsIcon } from "../_components/Icons";

export const dynamic = "force-dynamic";

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
  const week = weeks.includes(requested) ? requested : defaultWeek(weeks)!;
  const board = (await getWeekBoard(week))!;

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
        {board.matchups.length > 0 ? (
          <MatchupCarousel matchups={board.matchups} winBonus={WIN_BONUS} />
        ) : (
          <p className="roster-empty">No matchups this week.</p>
        )}

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
