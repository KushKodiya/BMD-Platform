// A notification channel. SMS (Twilio) can be added later as another
// implementation without touching the cron or trigger logic.
export interface Channel {
  name: string;
  // Send to an admin. A missing/empty address MUST no-op (return false), not throw,
  // so a stale turn with no contact info never blocks the draft.
  send(admin: { email: string | null }, subject: string, body: string): Promise<boolean>;
}
