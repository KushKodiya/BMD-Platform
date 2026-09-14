import type { Channel } from "./channel";
import { emailChannel } from "./email";

// Enabled channels. Add an smsChannel here later to fan the nudge out to SMS.
const channels: Channel[] = [emailChannel];

// Send the stale-turn nudge across all channels. Returns true if any channel
// actually delivered; a fully missing set of contacts is not an error.
export async function sendNudge(
  admin: { email: string | null },
  subject: string,
  body: string
): Promise<boolean> {
  const results = await Promise.all(
    channels.map((c) => c.send(admin, subject, body).catch(() => false))
  );
  return results.some(Boolean);
}
