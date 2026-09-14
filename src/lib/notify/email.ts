import { Resend } from "resend";
import type { Channel } from "./channel";

// Email nudge via Resend. No-ops (returns false) when the admin has no email or
// email isn't configured, so the cron never errors on a missing channel.
export const emailChannel: Channel = {
  name: "email",
  async send(admin, subject, body) {
    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.NUDGE_FROM_EMAIL;
    if (!admin.email || !apiKey || !from) return false;
    await new Resend(apiKey).emails.send({
      from,
      to: admin.email,
      subject,
      text: body,
    });
    return true;
  },
};
