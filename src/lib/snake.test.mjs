import { test } from "node:test";
import assert from "node:assert/strict";
import { teamOnClock, isDraftComplete, totalRounds } from "./snake.mjs";

const TEAMS = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9"];

test("round 1 runs forward t1..t9", () => {
  assert.equal(teamOnClock(0, TEAMS), "t1");
  assert.equal(teamOnClock(8, TEAMS), "t9");
});

test("round 2 runs in reverse t9..t1", () => {
  assert.equal(teamOnClock(9, TEAMS), "t9");
  assert.equal(teamOnClock(17, TEAMS), "t1");
});

test("round 3 resumes forward t1..t9", () => {
  assert.equal(teamOnClock(18, TEAMS), "t1");
  assert.equal(teamOnClock(26, TEAMS), "t9");
});

test("teamOnClock rejects bad input", () => {
  assert.throws(() => teamOnClock(-1, TEAMS));
  assert.throws(() => teamOnClock(0, []));
});

test("isDraftComplete flips exactly when pool empties", () => {
  assert.equal(isDraftComplete(39, 40), false);
  assert.equal(isDraftComplete(40, 40), true);
});

test("totalRounds: exact multiple and uneven", () => {
  assert.equal(totalRounds(36, 9), 4); // exact
  assert.equal(totalRounds(40, 9), 5); // uneven
  assert.equal(totalRounds(37, 9), 5);
});

test("uneven final round: 40 players / 9 teams -> t1-t4 get 5, rest get 4", () => {
  const counts = Object.fromEntries(TEAMS.map((t) => [t, 0]));
  for (let i = 0; i < 40; i++) counts[teamOnClock(i, TEAMS)]++;
  assert.deepEqual(counts, {
    t1: 5, t2: 5, t3: 5, t4: 5,
    t5: 4, t6: 4, t7: 4, t8: 4, t9: 4,
  });
});

test("exact multiple final round: 36 players -> all teams get 4", () => {
  const counts = Object.fromEntries(TEAMS.map((t) => [t, 0]));
  for (let i = 0; i < 36; i++) counts[teamOnClock(i, TEAMS)]++;
  assert.ok(Object.values(counts).every((c) => c === 4));
});
