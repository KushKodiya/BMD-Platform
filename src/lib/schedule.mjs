// Pure round-robin scheduler (circle method). Mirrors generate_schedule() in
// supabase/migrations/0007_season.sql the way snake.mjs mirrors team_on_clock:
// the SQL is authoritative for the stored schedule, this is the framework-free,
// unit-tested reference for the algorithm. No I/O.
// ponytail: kept as .mjs so `node --test` runs it with zero install.

/**
 * Single round-robin over the given teams by the circle method.
 * Odd team count -> one bye per week and (n) weeks, so every team byes exactly
 * once and faces every other team exactly once. Even count -> (n-1) weeks, no byes.
 *
 * @param {string[]} teamIds  team ids (already shuffled by the caller if random pairing is wanted).
 * @returns {{week:number, matchups:[string,string][], bye:string|null}[]}
 */
export function roundRobin(teamIds) {
  const n = teamIds.length;
  if (n < 2) throw new Error("need at least two teams");

  const arr = teamIds.slice();
  if (n % 2 === 1) arr.push(null); // NULL "bye" slot pads odd counts to even
  const m = arr.length;
  const rounds = m - 1;

  const weeks = [];
  for (let r = 0; r < rounds; r++) {
    const matchups = [];
    let bye = null;
    for (let i = 0; i < m / 2; i++) {
      const a = arr[i];
      const b = arr[m - 1 - i];
      if (a === null) bye = b;
      else if (b === null) bye = a;
      else matchups.push([a, b]);
    }
    weeks.push({ week: r + 1, matchups, bye });
    // Rotate: keep arr[0] fixed, rotate arr[1..] one step clockwise.
    arr.splice(1, 0, arr.pop());
  }
  return weeks;
}
