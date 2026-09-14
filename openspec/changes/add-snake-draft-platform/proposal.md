## Why

An organization needs to run a team draft where 9 designated people pick members of the
organization onto their teams in snake order, while everyone else watches. There is no
existing tool for this. The first version supports a "pick at leisure" (asynchronous)
draft so the 9 admins can make picks on their own schedule over hours or days, with a
nudge if someone stalls. A future version will add a live, real-time draft experience on
the same foundation.

## What Changes

- Introduce a web platform where an **owner** sets up a draft, **9 admins** (the owner is
  one of them) each own a team and pick on their turn, and **public viewers** watch a
  read-only draft board.
- The owner enters the **player pool** (people from the organization): name required, year
  in school and major optional.
- The owner sets the **initial draft order** of the 9 teams manually, with a
  **"randomize order"** button as an alternative.
- Picks proceed in **snake order** (odd rounds forward, even rounds reversed). Only the
  team currently on the clock may pick, and only an available player.
- The draft **runs until the player pool is empty** rather than for a fixed number of
  rounds. Rounds are derived (`ceil(players / 9)`); the final round may be uneven, so
  some teams end with one more player than others.
- Every pick is **final** — no undo, no skip, no auto-pick.
- If an admin does not pick within **4 hours** of their turn starting, the system sends
  **one** email nudge to that admin (using the email the admin sets on their own account).
  No repeat reminders. The draft stays blocked on that admin until they pick. (SMS is
  deferred to a later change; the notification path is built so it can be added without
  reworking the trigger.)
- Public **draft board** shows the snake grid (rounds x teams), each team's roster, and
  the remaining available player pool, updating as picks happen.

Async-first, but the data model and turn engine are designed so a later **live/real-time**
delivery can be added without reworking core behavior (out of scope for this change).

## Capabilities

### New Capabilities
- `access-control`: Roles and permissions — owner (super-admin), 9 team-owning admins, and
  public read-only viewers; who may set up, pick, and view; admins managing their own
  contact details.
- `draft-setup`: Owner-managed player pool (name + optional year/major), the 9 teams,
  initial draft order (manual or randomized), and starting the draft (which locks the pool
  and order).
- `draft-picking`: The snake-order turn engine — who is on the clock, making a valid pick,
  advancing the clock, deriving rounds, ending the draft when the pool is empty, and the
  read-only draft board / rosters.
- `notifications`: The 4-hour stale-turn nudge — a single email to the on-clock admin,
  fired by a scheduled check, with no repeats and no effect on turn order.

### Modified Capabilities
<!-- None: greenfield project, no existing specs. -->

## Impact

- **New codebase** (greenfield repo). Proposed stack: Next.js (UI + API routes),
  Supabase (Postgres + Auth + Realtime-ready), deployed on Vercel.
- **New dependencies**: Supabase client/SDK; an email sender (e.g. Resend or Supabase
  email) for the nudge. (SMS provider deferred to a later change.)
- **New scheduled job**: a Vercel Cron endpoint (~every 10 min) that detects turns idle
  more than 4 hours and sends the one-time nudge.
- **Server-side enforcement** of pick rules (on-clock admin only, available players only)
  is required — the source of truth is the database, not the UI.
