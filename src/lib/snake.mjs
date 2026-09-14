// Pure snake-draft engine. No I/O, no framework — safe to unit test and to
// share between server pick validation and board rendering.
// ponytail: kept framework-free .mjs so tests run with `node --test`, zero install.

/**
 * Which team is on the clock for a given 0-based pick index.
 * Snake order: round 1 (and every odd round) runs forward through the draft
 * order; round 2 (and every even round) runs in reverse.
 *
 * @param {number} pickIndex   0-based index of the pick being made (0 = first overall).
 * @param {string[]} orderedTeams  the draft order, e.g. team ids in order.
 * @returns {string} the team id on the clock for that pick.
 */
export function teamOnClock(pickIndex, orderedTeams) {
  const n = orderedTeams.length;
  if (n === 0) throw new Error("orderedTeams is empty");
  if (!Number.isInteger(pickIndex) || pickIndex < 0) {
    throw new Error(`pickIndex must be a non-negative integer, got ${pickIndex}`);
  }
  const round = Math.floor(pickIndex / n); // 0-based round
  const pos = pickIndex % n;
  // Even 0-based round (= odd 1-based round: 1st, 3rd, ...) goes forward.
  const forward = round % 2 === 0;
  return forward ? orderedTeams[pos] : orderedTeams[n - 1 - pos];
}

/**
 * The draft runs until the pool is empty, not for a fixed number of rounds.
 * @param {number} pickCount    number of picks made so far.
 * @param {number} playerCount  total players in the (locked) pool.
 */
export function isDraftComplete(pickCount, playerCount) {
  return pickCount >= playerCount;
}

/**
 * Derived round count: ceil(players / teams). The final round may be uneven.
 * @param {number} playerCount
 * @param {number} teamCount
 */
export function totalRounds(playerCount, teamCount) {
  if (teamCount <= 0) throw new Error("teamCount must be positive");
  return Math.ceil(playerCount / teamCount);
}
