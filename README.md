# BMD Draft Platform

A snake-order team drafting platform. One **owner** enters the player pool and starts the
draft; **9 admins** (the owner is one) each own a team and pick on their turn; anyone can
**view** the board without logging in. If an admin sits on the clock for over 4 hours, they
get one email nudge. The draft is "pick at leisure" (async); the data model and turn engine
are built so a live/real-time version can be added later.

## Stack

Next.js (App Router) · Supabase (Postgres + Auth) · Resend (email nudge) · Vercel (hosting + Cron).

The database is the source of truth: picks go only through the `make_pick` RPC (atomic
on-clock + availability check), and RLS makes the board public-read while gating setup to the
owner. Snake logic lives in `src/lib/snake.mjs` and is unit-tested (`npm test`).

## Local checks (no cloud needed)

```bash
npm install
npm test              # snake engine unit tests
npx tsc --noEmit      # typecheck
npm run build         # production build
```

## Bringing it up (the cloud-dependent steps)

1. **Create a Supabase project.** Copy the URL, anon key, and service-role key into `.env`
   (see `.env.example`). Also set `RESEND_API_KEY`, `NUDGE_FROM_EMAIL`, and a `CRON_SECRET`.
2. **Apply the schema:** run `supabase/migrations/0001_init.sql` then `supabase/seed.sql`
   (via the Supabase SQL editor or CLI). This creates the tables, RLS, RPCs, and 9 teams.
3. **Create the admins:** copy `scripts/admins.example.json` to `scripts/admins.json`, fill in
   9 real emails/passwords/teams with exactly one `"owner": true`, then:
   ```bash
   node scripts/setup-admins.mjs scripts/admins.json
   ```
   This creates the auth accounts, sets the owner flag, and links each admin to a team.
4. **Run it:** `npm run dev`, sign in as the owner, add players and set/randomize the order on
   `/setup`, then start the draft. Admins sign in and pick on their turn.
5. **Deploy:** push to Vercel, set the same env vars as project secrets. `vercel.json` already
   registers the `/api/cron/nudge` job every 10 minutes; Vercel sends `CRON_SECRET` as the
   bearer token so the endpoint authorizes it.

## Deferred / follow-ups

- **SMS nudge** — email-only for now; `src/lib/notify` has a channel abstraction so a Twilio
  channel can be added without touching the cron or trigger.
- **Live/real-time board** — currently updates on load/refresh; swap to a Supabase Realtime
  subscription on the `picks` table later (no schema change).
- **Next.js version** — pinned to 14.2.x. Several `npm audit` advisories are only fully closed
  in Next 15/16, which require a React 19 migration; treat that as a separate change.
