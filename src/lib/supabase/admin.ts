import { createClient } from "@supabase/supabase-js";

// Service-role client that bypasses RLS. Server-only (cron, seeding).
// Never import this into anything that reaches the browser.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
