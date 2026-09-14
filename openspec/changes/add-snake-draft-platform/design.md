## Context

Greenfield project. See proposal.md ("Why") for motivation. The core is a single-source-of-
truth turn machine (whose turn it is, who has been picked) that many people read at once and
9 people write to, one at a time. Version 1 is asynchronous ("pick at leisure"); a later
version will add live real-time delivery. The design must make that later upgrade cheap.

## Goals / Non-Goals

**Goals:**
- Server/database is the authority for turn state and pick validity; the UI is never trusted.
- Data model and turn engine identical between async and future live versions — only update
  delivery changes.
- Minimal infrastructure: one repo, one deploy, one scheduled job.

**Non-Goals:**
- Real-time/live draft delivery (deferred; the stack is chosen to make it a small add).
- Undo, skip, auto-pick (explicitly excluded per specs).
- Multiple concurrent drafts / multi-tenant. Assume one draft at a time for v1.
- Repeat reminders or escalation beyond the single 4-hour nudge.

## Decisions

**Stack: Next.js + Supabase (Postgres + Auth) + Vercel.**
Why: one full-stack framework and a hosted DB with auth built in gives the fewest moving
parts. Supabase Realtime exists but is unused in v1 — chosen so the future live version is a
subscription swap, not a re-platform. Alternatives: plain Node + Postgres (more glue, own
auth); Firebase (realtime-first but weaker relational fit for a snake grid).

**Turn state is a derived-but-persisted pointer, computed server-side.**
The draft has an ordered pick sequence. The "on the clock" team is determined by the count of
picks made so far mapped onto the snake sequence over the initial order. Store `picks` as an
append-only ordered list; derive current turn from `pick_count`. This makes "picks are final"
and "no undo" fall out naturally (append-only) and makes the snake math a pure function.
Alternative considered: storing an explicit `current_team_id` mutated on each pick — rejected
as redundant state that can drift from the pick log.

**Snake mapping is a pure function** `teamOnClock(pickIndex, orderedTeams)`:
`round = floor(pickIndex / 9)`; position within round `p = pickIndex % 9`; team index is `p`
on even rounds (0-based) and `8 - p` on odd rounds. Draft is complete when
`pick_count == player_count`. This one function is unit-testable in isolation and shared by
board rendering and pick validation.

**Pick validity enforced in a single server transaction.** A pick request checks, atomically:
(a) draft in progress, (b) requesting admin owns the team returned by `teamOnClock`,
(c) player exists and is not already drafted. Then it inserts the pick. Doing this in one DB
transaction (or a Postgres RPC / row-locked insert) prevents double-picks under concurrent
requests. Alternative: app-level checks without a transaction — rejected (race between two
admins or double-submits could assign the same player twice or let the wrong team pick).

**Stale-turn nudge via Vercel Cron polling.** A cron endpoint runs ~every 10 minutes and
finds the in-progress turn whose `turn_started_at` is older than 4 hours and not yet notified,
sends the email, and sets a `notified_at` flag on that turn. `turn_started_at` is written
when the clock advances (i.e., on each pick and at draft start). Alternative: a delayed job/
queue scheduled per turn — rejected as more infra than a stateless cron for a once-per-turn
reminder. The cron is also the natural hook for a future auto-pick if ever wanted.

**Email via Resend; SMS deferred.** Email is a simple HTTP API with no setup friction. SMS
is dropped from this change (it needs a paid account, phone number, and possible US sender
registration). The notification module is written around a channel abstraction so a Twilio
SMS channel can be added later without touching the cron or the trigger logic.

## Risks / Trade-offs

- **Double-pick / wrong-turn race under concurrency** → single atomic transaction with the
  turn check and player-availability check inside it; unique constraint on `(player_id)` in
  picks so a player can be drafted at most once.
- **SMS deferred** → email-only for this change; SMS is additive and isolated behind a
  channel abstraction in the notification module, so adding it later is a self-contained change.
- **Cron granularity means the nudge fires up to ~10 min late** → acceptable for a 4-hour
  threshold; not worth per-turn scheduling.
- **Async board staleness (viewers see old state until refresh)** → acceptable in v1 by
  design; the live version replaces polling/refresh with a Supabase Realtime subscription on
  the picks table with no schema change.
- **Owner-is-also-admin role overlap** → model role as a set of capabilities on an account,
  not mutually exclusive types, so one account can hold both owner and admin.

## Migration Plan

Greenfield — no data migration. Deploy the Next.js app to Vercel, provision the Supabase
project (schema + auth + the 9 admin accounts + owner flag), configure the Resend secret,
and register the Vercel Cron schedule. Rollback for v1 is redeploying a prior build; no
destructive migrations are involved in the initial release.

## Open Questions

- Exact tie-break for "uneven final round" is fully determined by snake order (earlier slots
  in the final round get the extra player) — no decision needed, noted for clarity.
- Team naming: RESOLVED — each admin names their own team from their account page, via the
  `set_my_team_name` RPC (scoped to auth.uid()). See the access-control spec.
