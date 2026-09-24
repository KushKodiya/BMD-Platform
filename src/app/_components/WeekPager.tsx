import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

// Prev/next week navigation. Server-rendered links that set ?week=N -- no client
// state. Disabled ends render as inert spans so there is nothing to click past.
export default function WeekPager({
  base, week, weeks,
}: {
  base: string;
  week: number;
  weeks: number[];
}) {
  const idx = weeks.indexOf(week);
  const prev = idx > 0 ? weeks[idx - 1] : null;
  const next = idx >= 0 && idx < weeks.length - 1 ? weeks[idx + 1] : null;

  return (
    <div className="week-pager">
      {prev != null ? (
        <Link href={`${base}?week=${prev}`} className="btn-ghost btn-sm">
          <ChevronLeftIcon size={15} /> Prev
        </Link>
      ) : (
        <span className="btn-ghost btn-sm is-disabled" aria-disabled="true">
          <ChevronLeftIcon size={15} /> Prev
        </span>
      )}

      <span className="week-pager-label">
        Week {week} <span className="dim">of {weeks.length}</span>
      </span>

      {next != null ? (
        <Link href={`${base}?week=${next}`} className="btn-ghost btn-sm">
          Next <ChevronRightIcon size={15} />
        </Link>
      ) : (
        <span className="btn-ghost btn-sm is-disabled" aria-disabled="true">
          Next <ChevronRightIcon size={15} />
        </span>
      )}
    </div>
  );
}
