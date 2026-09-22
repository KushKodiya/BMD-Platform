import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deadlineMs, remainingMs, formatRemaining, describeLimit, isUrgent,
  MIN_PICK_SECONDS, MAX_PICK_SECONDS, CLOCK_PRESETS,
} from "./clock.mjs";

const START = "2026-01-01T00:00:00.000Z";
const startMs = Date.parse(START);

test("deadlineMs adds the limit to the turn start", () => {
  assert.equal(deadlineMs(START, 120), startMs + 120_000);
});

test("deadlineMs returns null when there is no limit or no turn", () => {
  assert.equal(deadlineMs(START, null), null);
  assert.equal(deadlineMs(null, 120), null);
  assert.equal(deadlineMs("not a date", 120), null);
});

test("remainingMs counts down and floors at zero", () => {
  const d = deadlineMs(START, 60);
  assert.equal(remainingMs(d, startMs), 60_000);
  assert.equal(remainingMs(d, startMs + 59_000), 1_000);
  assert.equal(remainingMs(d, startMs + 60_000), 0);
  assert.equal(remainingMs(d, startMs + 999_000), 0); // long past expiry
  assert.equal(remainingMs(null, startMs), null);
});

test("formatRemaining renders M:SS, and H:MM:SS past an hour", () => {
  assert.equal(formatRemaining(0), "0:00");
  assert.equal(formatRemaining(9_000), "0:09");
  assert.equal(formatRemaining(65_000), "1:05");
  assert.equal(formatRemaining(600_000), "10:00");
  assert.equal(formatRemaining(3_600_000), "1:00:00");
  assert.equal(formatRemaining(3_661_000), "1:01:01");
  assert.equal(formatRemaining(-5_000), "0:00"); // never shows negative
});

test("formatRemaining rounds up so a fresh 60s clock reads 1:00, not 0:59", () => {
  assert.equal(formatRemaining(59_999), "1:00");
  assert.equal(formatRemaining(1), "0:01");
});

test("describeLimit names presets and falls back for custom values", () => {
  assert.equal(describeLimit(null), "No limit");
  assert.equal(describeLimit(300), "5 minutes");
  assert.equal(describeLimit(45), "45 seconds");
  assert.equal(describeLimit(420), "7 minutes");
  assert.equal(describeLimit(7200), "2 hours");
});

test("isUrgent uses the larger of 10s or the final 10%", () => {
  assert.equal(isUrgent(11_000, 60), false);   // 10% of 60s = 6s -> 10s floor
  assert.equal(isUrgent(9_000, 60), true);
  assert.equal(isUrgent(70_000, 600), false);  // 10% of 600s = 60s
  assert.equal(isUrgent(50_000, 600), true);
  assert.equal(isUrgent(null, 60), false);
  assert.equal(isUrgent(5_000, null), false);  // no limit is never urgent
});

test("every preset is null or inside the range the DB accepts", () => {
  for (const { seconds } of CLOCK_PRESETS) {
    if (seconds === null) continue;
    assert.ok(seconds >= MIN_PICK_SECONDS && seconds <= MAX_PICK_SECONDS, `${seconds} out of range`);
  }
});
