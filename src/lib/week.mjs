// Season weeks run Sunday 00:00 to Saturday 23:59 America/New_York. Week 1
// begins Sunday 2026-09-27. Kept .mjs so `node --test` runs it with zero
// install, like snake.mjs/clock.mjs -- pure calendar math, no I/O.
//
// The anchor and every week boundary are handled as UTC-midnight timestamps and
// only ever get whole-day arithmetic, never wall-clock, so DST never enters in:
// "Sunday 00:00 ET" is just the ET calendar date rolling over to that Sunday,
// which we detect by comparing ET calendar dates, not fixed offsets.

const ANCHOR_UTC = Date.UTC(2026, 8, 27); // 2026-09-27 (month is 0-based)
const DAY = 86_400_000;
const WEEK = 7 * DAY;

/** The ET calendar date of `now`, as a UTC-midnight timestamp for day math. */
export function etDate(now = new Date()) {
  // en-CA formats as YYYY-MM-DD; reparse as UTC midnight so diffs are whole days.
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const [y, m, d] = s.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** 1-based week number containing an ET-midnight timestamp. May be < 1 before
 *  the season or > the schedule length after it; callers clamp for selection. */
export function weekForDate(etMidnightUtc) {
  return Math.floor((etMidnightUtc - ANCHOR_UTC) / WEEK) + 1;
}

/** The current season week for `now`, measured in Eastern Time. */
export function currentWeek(now = new Date()) {
  return weekForDate(etDate(now));
}

/** { start, end } UTC-midnight timestamps for a week's Sunday and Saturday. */
export function weekBounds(week) {
  const start = ANCHOR_UTC + (week - 1) * WEEK;
  return { start, end: start + 6 * DAY };
}

/** "Sep 27 – Oct 3" range label for a week. */
export function weekRangeLabel(week) {
  const { start, end } = weekBounds(week);
  const fmt = (t) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", month: "short", day: "numeric" }).format(t);
  return `${fmt(start)} – ${fmt(end)}`;
}

/** The single week open for scoring right now: the current ET week when it is
 *  one of the scheduled weeks, else null (before the season starts or after it
 *  ends). Exactly one week is ever open -- it opens at its Sunday 00:00 ET start
 *  and closes at Saturday 23:59 ET when the clock rolls to the next week, with no
 *  manual step, because it is derived from the current time on every read. */
export function openWeek(weeks, now = new Date()) {
  if (!weeks || weeks.length === 0) return null;
  const cur = currentWeek(now);
  return weeks.includes(cur) ? cur : null;
}

/** The week to show by default: the current ET week, clamped into the weeks the
 *  schedule actually spans (before the season -> first week, after -> last). */
export function defaultWeek(weeks, now = new Date()) {
  if (weeks.length === 0) return null;
  const cur = currentWeek(now);
  if (weeks.includes(cur)) return cur;
  const min = weeks[0];
  const max = weeks[weeks.length - 1];
  return cur < min ? min : cur > max ? max : cur;
}
