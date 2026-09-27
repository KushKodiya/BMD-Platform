import { test } from "node:test";
import assert from "node:assert/strict";
import { currentWeek, weekForDate, etDate, weekRangeLabel, defaultWeek, openWeek } from "./week.mjs";

// Week 1 = Sun 2026-09-27 .. Sat 2026-10-03, Eastern Time.
test("week 1 covers Sun Sep 27 through Sat Oct 3", () => {
  assert.equal(weekForDate(Date.UTC(2026, 8, 27)), 1); // Sunday 00:00
  assert.equal(weekForDate(Date.UTC(2026, 9, 3)), 1); // Saturday
  assert.equal(weekForDate(Date.UTC(2026, 9, 4)), 2); // next Sunday -> week 2
  assert.equal(weekForDate(Date.UTC(2026, 8, 26)), 0); // Saturday before -> pre-season
});

test("boundary flips at ET midnight, not UTC midnight", () => {
  // Sat Oct 3 23:30 ET is Sun Oct 4 03:30 UTC -- still week 1 in ET.
  assert.equal(etDate(new Date("2026-10-04T03:30:00Z")), Date.UTC(2026, 9, 3));
  assert.equal(weekForDate(etDate(new Date("2026-10-04T03:30:00Z"))), 1);
  // Sun Oct 4 00:30 ET is 04:30 UTC -- now week 2.
  assert.equal(weekForDate(etDate(new Date("2026-10-04T04:30:00Z"))), 2);
});

test("DST does not drift the boundary (Nov 1 2026 fall-back)", () => {
  // Week 6 starts Sun Nov 1 2026, the DST change day. Still detected at ET midnight.
  assert.equal(weekForDate(Date.UTC(2026, 10, 1)), 6);
  assert.equal(weekForDate(etDate(new Date("2026-11-01T04:59:00Z"))), 6); // 00:59 EDT
});

test("range label reads Sun..Sat", () => {
  assert.equal(weekRangeLabel(1), "Sep 27 – Oct 3");
  assert.equal(weekRangeLabel(2), "Oct 4 – Oct 10");
});

test("openWeek is exactly the current week, or null off-season", () => {
  const weeks = [1, 2, 3];
  assert.equal(openWeek(weeks, new Date("2026-09-27T12:00:00Z")), 1); // week 1 live
  assert.equal(openWeek(weeks, new Date("2026-10-06T12:00:00Z")), 2); // week 2 live
  assert.equal(openWeek(weeks, new Date("2026-09-20T12:00:00Z")), null); // before season
  assert.equal(openWeek(weeks, new Date("2027-01-01T12:00:00Z")), null); // after last week
  assert.equal(openWeek([], new Date("2026-09-27T12:00:00Z")), null); // no schedule
});

test("defaultWeek clamps into the scheduled weeks", () => {
  const weeks = [1, 2, 3];
  assert.equal(defaultWeek(weeks, new Date("2026-09-20T12:00:00Z")), 1); // pre-season -> first
  assert.equal(defaultWeek(weeks, new Date("2026-10-06T12:00:00Z")), 2); // mid -> current
  assert.equal(defaultWeek(weeks, new Date("2027-01-01T12:00:00Z")), 3); // past -> last
  assert.equal(currentWeek(new Date("2026-09-27T12:00:00Z")), 1);
});
