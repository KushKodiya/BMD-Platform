// Pure pick-clock math. No I/O, no framework -- same reasoning as snake.mjs, so
// the countdown the browser renders and the deadline the server enforces are
// derived from one tested formula.

/** Presets offered to the owner, in seconds. null = no limit. */
export const CLOCK_PRESETS = [
  { label: "No limit", seconds: null },
  { label: "30 seconds", seconds: 30 },
  { label: "1 minute", seconds: 60 },
  { label: "2 minutes", seconds: 120 },
  { label: "3 minutes", seconds: 180 },
  { label: "5 minutes", seconds: 300 },
  { label: "10 minutes", seconds: 600 },
  { label: "15 minutes", seconds: 900 },
  { label: "30 minutes", seconds: 1800 },
  { label: "1 hour", seconds: 3600 },
  { label: "4 hours", seconds: 14400 },
  { label: "12 hours", seconds: 43200 },
  { label: "24 hours", seconds: 86400 },
];

export const MIN_PICK_SECONDS = 10;
export const MAX_PICK_SECONDS = 86400; // 24h -- mirrors the DB check constraint.

/**
 * When the current turn expires, in epoch ms.
 * @param {string|null} turnStartedAt  ISO timestamp the turn began (DB time).
 * @param {number|null} pickSeconds    the configured limit; null = no limit.
 * @returns {number|null} epoch ms, or null when there is no deadline.
 */
export function deadlineMs(turnStartedAt, pickSeconds) {
  if (!turnStartedAt || pickSeconds == null) return null;
  const started = Date.parse(turnStartedAt);
  if (Number.isNaN(started)) return null;
  return started + pickSeconds * 1000;
}

/**
 * Milliseconds left on the clock, floored at 0.
 * @param {number|null} deadline  epoch ms from deadlineMs().
 * @param {number} now            epoch ms, already corrected to server time.
 */
export function remainingMs(deadline, now) {
  if (deadline == null) return null;
  return Math.max(0, deadline - now);
}

/**
 * Countdown label: M:SS under an hour, H:MM:SS at or over it.
 * @param {number} ms  milliseconds remaining (negatives clamp to 0:00).
 */
export function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** Human label for a configured limit, e.g. for "5 minutes per pick". */
export function describeLimit(pickSeconds) {
  if (pickSeconds == null) return "No limit";
  const preset = CLOCK_PRESETS.find((p) => p.seconds === pickSeconds);
  if (preset) return preset.label;
  if (pickSeconds % 3600 === 0) return `${pickSeconds / 3600} hours`;
  if (pickSeconds % 60 === 0) return `${pickSeconds / 60} minutes`;
  return `${pickSeconds} seconds`;
}

/**
 * The turn is "urgent" in its last 10s, or its last 10% on a long clock --
 * whichever window is bigger. Drives the red styling only.
 */
export function isUrgent(remaining, pickSeconds) {
  if (remaining == null || pickSeconds == null) return false;
  const window = Math.max(10_000, pickSeconds * 100); // pickSeconds*1000*0.1
  return remaining <= window;
}
