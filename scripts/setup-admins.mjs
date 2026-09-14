// Setup / re-sync the 9 admin auth accounts, their profiles (one owner), and
// team links from a config file. Idempotent: safe to re-run after editing
// logins — existing users get their password + email reset, missing ones are
// created. Run AFTER migration + seed:
//   node scripts/setup-admins.mjs scripts/admins.json
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the env.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Load .env / .env.local (plain `node` doesn't do this automatically).
for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* file may not exist */ }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const configPath = process.argv[2] || "scripts/admins.json";
const admins = JSON.parse(readFileSync(configPath, "utf8"));
if (admins.length !== 9 || admins.filter((a) => a.owner).length !== 1) {
  console.error("Config must list exactly 9 admins with exactly one owner:true.");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

// Map existing auth users by email so re-runs update instead of failing.
const { data: list, error: listErr } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listErr) throw listErr;
const existingByEmail = new Map(list.users.map((u) => [u.email, u]));

for (const a of admins) {
  const found = existingByEmail.get(a.email);
  let uid;
  if (found) {
    const { error } = await db.auth.admin.updateUserById(found.id, {
      password: a.password,
      email_confirm: true,
    });
    if (error) throw error;
    uid = found.id;
  } else {
    const { data: created, error } = await db.auth.admin.createUser({
      email: a.email,
      password: a.password,
      email_confirm: true,
    });
    if (error) throw error;
    uid = created.user.id;
  }

  const { error: profErr } = await db
    .from("profiles")
    .upsert({ id: uid, email: a.email, is_owner: !!a.owner });
  if (profErr) throw profErr;

  // teams.admin_id is unique, so free this user from any prior team first.
  await db.from("teams").update({ admin_id: null }).eq("admin_id", uid);
  const { error: teamErr } = await db.from("teams").update({ admin_id: uid }).eq("name", a.team);
  if (teamErr) throw teamErr;

  console.log(`synced ${a.email}${a.owner ? " (owner)" : ""} -> ${a.team}`);
}

console.log("Done. Log in with the email/password pairs from your config file.");
