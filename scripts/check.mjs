// Diagnostic: confirms env + connection, then prints the real state of the DB.
//   node scripts/check.mjs
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* optional */ }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
console.log("URL set:        ", !!url, url ? `(${url})` : "");
console.log("service key set:", !!serviceKey);
if (!url || !serviceKey) {
  console.error("\n-> .env is not being read. Create .env in the repo root with those two vars.");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: teams, error: teamErr } = await db.from("teams").select("name, admin_id").order("name");
if (teamErr) {
  console.error("\n-> Could not read teams. Did the migration + seed run?", teamErr.message);
  process.exit(1);
}
console.log(`\nteams: ${teams.length} (expected 9)`);
console.log(`teams linked to an admin: ${teams.filter((t) => t.admin_id).length}`);

const { data: list, error: listErr } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listErr) { console.error("auth list error:", listErr.message); process.exit(1); }
console.log(`\nauth users: ${list.users.length}`);
for (const u of list.users) console.log(`  - ${u.email}  confirmed=${!!u.email_confirmed_at}`);

console.log("\nIf auth users is 0 -> run: node scripts/setup-admins.mjs scripts/admins.json");
console.log("If users exist, log in with an EXACT email/password from scripts/admins.json.");
