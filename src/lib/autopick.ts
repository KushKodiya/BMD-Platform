import type { SupabaseClient } from "@supabase/supabase-js";

// Safety valve: one run can't loop forever even if the RPC misbehaves. Each
// iteration is one pick, and a draft has far fewer picks than this.
const MAX_DRAIN = 500;

/**
 * Clear any expired turn. The open board normally trips the clock itself, so
 * this is the backstop for when nobody has a tab open.
 *
 * In practice this settles after one pick: advancing the clock restarts
 * turn_started_at, so the next team is never already expired and a long gap
 * can't cascade through the pool. The loop is a guard, not the normal path.
 *
 * Passing no expected index tells the RPC to act on whatever turn it finds; the
 * deadline check inside it is still the only thing that authorises a pick.
 */
export async function drainExpiredTurns(db: SupabaseClient): Promise<number> {
  let picked = 0;
  for (let i = 0; i < MAX_DRAIN; i++) {
    const { data, error } = await db.rpc("auto_pick_if_expired", { p_expected_pick_index: null });
    if (error || !data) break; // error, or nothing was expired
    picked++;
  }
  return picked;
}
