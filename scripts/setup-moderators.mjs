// Create / re-sync the moderator auth accounts and mark their profiles
// is_moderator = true. Moderators enter scores (weekly + exam/IM) and nothing
// else; they are not tied to a team. Idempotent: safe to re-run after editing
// the config -- existing users get their password reset, missing ones created.
//
// Fill scripts/moderators.json with the 3 real email/password pairs first, then:
//   node scripts/setup-moderators.mjs scripts/moderators.json
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the env.
// Run AFTER migration 0010 (which adds the is_moderator column).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", ".env"]) {
  try { process.loadEnvFile(f); } catch { /* file may not exist */ }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
  process.exit(1);
}

const configPath = process.argv[2] || "scripts/moderators.json";
const mods = JSON.parse(readFileSync(configPath, "utf8"));
if (!Array.isArray(mods) || mods.length === 0) {
  console.error("Config must be a non-empty array of { email, password }.");
  process.exit(1);
}
if (mods.some((m) => !m.email || !m.password || /CHANGE_ME/.test(m.password))) {
  console.error("Fill in a real email and password for every moderator first.");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

const { data: list, error: listErr } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (listErr) throw listErr;
const existingByEmail = new Map(list.users.map((u) => [u.email, u]));

for (const m of mods) {
  const found = existingByEmail.get(m.email);
  let uid;
  if (found) {
    const { error } = await db.auth.admin.updateUserById(found.id, {
      password: m.password,
      email_confirm: true,
    });
    if (error) throw error;
    uid = found.id;
  } else {
    const { data: created, error } = await db.auth.admin.createUser({
      email: m.email,
      password: m.password,
      email_confirm: true,
    });
    if (error) throw error;
    uid = created.user.id;
  }

  // Mark the profile as a moderator without disturbing an existing owner flag.
  const { error: profErr } = await db
    .from("profiles")
    .upsert({ id: uid, email: m.email, is_moderator: true });
  if (profErr) throw profErr;

  console.log(`synced moderator ${m.email}`);
}

console.log("Done. Moderators can sign in and use the Scores tab.");
