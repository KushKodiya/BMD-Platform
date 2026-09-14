// Delete auth users that are NOT in your admins config (orphans from earlier
// runs where logins/emails changed). Previews by default; pass --force to delete.
//   node scripts/prune-admins.mjs scripts/admins.json          # preview
//   node scripts/prune-admins.mjs scripts/admins.json --force  # delete
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

const args = process.argv.slice(2);
const force = args.includes("--force");
const configPath = args.find((a) => !a.startsWith("--")) || "scripts/admins.json";
const keep = new Set(JSON.parse(readFileSync(configPath, "utf8")).map((a) => a.email));

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const { data: list, error } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (error) throw error;

const orphans = list.users.filter((u) => !keep.has(u.email));
if (orphans.length === 0) {
  console.log("No orphans. All auth users are in your config.");
  process.exit(0);
}

console.log(`${orphans.length} auth user(s) not in ${configPath}:`);
for (const u of orphans) console.log(`  - ${u.email}`);

if (!force) {
  console.log("\nPreview only. Re-run with --force to delete these.");
  process.exit(0);
}

for (const u of orphans) {
  const { error: delErr } = await db.auth.admin.deleteUser(u.id);
  if (delErr) throw delErr;
  console.log(`deleted ${u.email}`);
}
console.log("Done. Run scripts/check.mjs to confirm 9 users remain.");
