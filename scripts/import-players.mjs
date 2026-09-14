// Bulk-import players from a roster CSV into the players table.
//   node scripts/import-players.mjs "Group_Roster_20260914_153454.csv"
// CSV columns: First Name, Last Name, Expected Undergraduate School Year.
// Rows whose year is an excluded status are skipped; blank years import as null.
// Uses the service-role client (bypasses RLS). Run while the draft is in setup.
// Idempotent: skips names already in the pool, so it's safe to re-run.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* optional */ }
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const EXCLUDE_YEARS = new Set([
  "Past Expected Graduation Date",
  "Incomplete mySigEp Registration",
]);

const path = process.argv[2] || "Group_Roster_20260914_153454.csv";
const raw = readFileSync(path, "utf8").replace(/^﻿/, ""); // strip BOM
const lines = raw.split(/\r?\n/).filter((l) => l.trim() !== "");
lines.shift(); // drop header row

const rows = [];
let skipped = 0;
for (const line of lines) {
  const [first = "", last = "", year = ""] = line.split(",").map((c) => c.trim());
  if (EXCLUDE_YEARS.has(year)) { skipped++; continue; }
  const name = `${first} ${last}`.trim();
  if (!name) { skipped++; continue; }
  rows.push({ name, year_in_school: year || null, major: null });
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// Skip players already in the pool (case-insensitive on name).
const { data: existing, error: exErr } = await db.from("players").select("name");
if (exErr) { console.error("Could not read players:", exErr.message); process.exit(1); }
const have = new Set((existing ?? []).map((p) => p.name.toLowerCase()));
const toInsert = rows.filter((r) => !have.has(r.name.toLowerCase()));

console.log(`parsed ${rows.length} eligible rows, ${skipped} skipped by filter`);
console.log(`${rows.length - toInsert.length} already in pool, inserting ${toInsert.length}`);

if (toInsert.length) {
  const { error } = await db.from("players").insert(toInsert);
  if (error) { console.error("Insert failed:", error.message); process.exit(1); }
}
console.log("Done. Total players now:", (have.size + toInsert.length));
