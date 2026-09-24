import { test } from "node:test";
import assert from "node:assert/strict";
import { roundRobin } from "./schedule.mjs";

const TEAMS = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8", "t9"];

const pairKey = (a, b) => [a, b].sort().join("|");

test("9 teams -> 9 weeks, one bye each week", () => {
  const weeks = roundRobin(TEAMS);
  assert.equal(weeks.length, 9);
  for (const w of weeks) {
    assert.equal(w.matchups.length, 4);
    assert.notEqual(w.bye, null);
  }
});

test("every team byes exactly once", () => {
  const byes = Object.fromEntries(TEAMS.map((t) => [t, 0]));
  for (const w of roundRobin(TEAMS)) byes[w.bye]++;
  assert.ok(Object.values(byes).every((c) => c === 1), JSON.stringify(byes));
});

test("every pair meets exactly once (no repeats, none missed)", () => {
  const seen = new Map();
  for (const w of roundRobin(TEAMS)) {
    for (const [a, b] of w.matchups) {
      const k = pairKey(a, b);
      seen.set(k, (seen.get(k) ?? 0) + 1);
    }
  }
  // C(9,2) = 36 distinct pairs, each once.
  assert.equal(seen.size, 36);
  assert.ok([...seen.values()].every((c) => c === 1));
});

test("each team plays every other team once (8 games)", () => {
  const games = Object.fromEntries(TEAMS.map((t) => [t, 0]));
  for (const w of roundRobin(TEAMS)) {
    for (const [a, b] of w.matchups) { games[a]++; games[b]++; }
  }
  assert.ok(Object.values(games).every((c) => c === 8), JSON.stringify(games));
});

test("even team count -> n-1 weeks, no byes", () => {
  const weeks = roundRobin(["a", "b", "c", "d"]);
  assert.equal(weeks.length, 3);
  for (const w of weeks) {
    assert.equal(w.bye, null);
    assert.equal(w.matchups.length, 2);
  }
});

test("rejects fewer than two teams", () => {
  assert.throws(() => roundRobin(["solo"]));
});
