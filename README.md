# BMD Draft Platform

A snake-order team drafting platform for the **Sigma Phi Epsilon, Indiana Alpha Balanced Man
Draft**. One **owner** enters the player pool and starts the draft; **9 admins** (the owner is
one) each own a team and pick on their turn; anyone can **view** the board without logging in.

The owner sets a **pick clock** — how long each team gets once they're on the clock. The board
shows a live countdown, and a team that runs out of time is assigned a random player from the
remaining pool so the draft keeps moving. With no clock set, the draft is "pick at leisure"
(async) and an admin sitting on the clock for over 4 hours gets one email nudge.

## Stack

Next.js (App Router) · Supabase (Postgres + Auth) · Resend (email nudge) · Vercel (hosting + Cron).

The database is the source of truth: picks go only through the `make_pick` RPC (atomic
on-clock + availability check), and RLS makes the board public-read while gating setup to the
owner. Snake logic lives in `src/lib/snake.mjs` and pick-clock math in `src/lib/clock.mjs`;
both are unit-tested (`npm test`).

## The pick clock

Set it on `/setup` (owner only) — presets from 30 seconds to 24 hours, or a custom value. It's
the one setting that stays editable after the draft starts, and a new limit applies to the turn
already running (the deadline is always `turn_started_at + pick_seconds`).

**How expiry is enforced.** Vercel is serverless — there's no long-running process to fire a
timer — so enforcement is layered, and the database is the only authority:

1. **`auto_pick_if_expired()`** (Postgres) is the single decision point. It takes the same row
   lock `make_pick()` does, re-checks the deadline against the DB clock, and only then assigns a
   random undrafted player. Nothing outside the database can make a pick happen early.
2. **The open board** calls it when its countdown hits zero. Anyone's browser can trip it —
   including a logged-out viewer's — because the RPC is self-gating. Calls are jittered so nine
   open tabs don't stampede; the row lock means only one can win.
3. **`/api/cron/autopick`** is the backstop for when every tab is closed (see `vercel.json`).
4. **`make_pick()`** drains an expired turn on the way in, so a late admin can't reclaim a turn
   just because nobody happened to be watching when it expired.

Advancing the clock resets `turn_started_at`, so an expired turn costs exactly that one turn —
it can't cascade through the pool, and the next team always gets their full clock. Auto-picks
are flagged `auto` in the `picks` table and marked with a clock icon on the board.

> Per-minute crons need a Vercel plan that allows them. The client trigger is the primary path
> and doesn't depend on cron at all; cron only matters when no one has the board open.

## Design

Purple/red SigEp palette, Bebas Neue + Source Sans 3, self-hosted via `next/font`. Tokens live
at the top of `src/app/globals.css`. All motion is transform/opacity only and is disabled under
`prefers-reduced-motion`.

## Local checks (no cloud needed)

```bash
npm install
npm test              # snake engine + pick clock unit tests
npx tsc --noEmit      # typecheck
npm run build         # production build
```

## Bringing it up (the cloud-dependent steps)

1. **Create a Supabase project.** Copy the URL, anon key, and service-role key into `.env`
   (see `.env.example`). Also set `RESEND_API_KEY`, `NUDGE_FROM_EMAIL`, and a `CRON_SECRET`.
2. **Apply the schema:** run the migrations in `supabase/migrations/` in order
   (`0001_init.sql`, `0002_team_name.sql`, `0003_pick_timer.sql`), then `supabase/seed.sql`
   (via the Supabase SQL editor or CLI). This creates the tables, RLS, RPCs, and 9 teams.
   **An existing deployment only needs `0003_pick_timer.sql`** — it adds the `pick_seconds`
   and `auto` columns and the clock RPCs, and replaces `make_pick()` in place.
3. **Create the admins:** copy `scripts/admins.example.json` to `scripts/admins.json`, fill in
   9 real emails/passwords/teams with exactly one `"owner": true`, then:
   ```bash
   node scripts/setup-admins.mjs scripts/admins.json
   ```
   This creates the auth accounts, sets the owner flag, and links each admin to a team.
4. **Run it:** `npm run dev`, sign in as the owner, add players, set the pick clock, set or
   randomize the order on `/setup`, then start the draft. Admins sign in and pick on their turn.
5. **Deploy:** push to Vercel, set the same env vars as project secrets. `vercel.json` registers
   `/api/cron/autopick` every minute and `/api/cron/nudge` every 10 minutes; Vercel sends
   `CRON_SECRET` as the bearer token so both endpoints authorize it.

## Deferred / follow-ups

- **SMS nudge** — email-only for now; `src/lib/notify` has a channel abstraction so a Twilio
  channel can be added without touching the cron or trigger.
- **Live/real-time board** — the board currently polls every 15s from the clock component;
  swap to a Supabase Realtime subscription on the `picks` table later (no schema change).
- **Next.js version** — pinned to 14.2.x. Several `npm audit` advisories are only fully closed
  in Next 15/16, which require a React 19 migration; treat that as a separate change.
- **`ui-ux-pro-max-skill-main/`** — a vendored design skill, excluded in `tsconfig.json` so
  `next build` doesn't type-check its CLI and gallery sources.
