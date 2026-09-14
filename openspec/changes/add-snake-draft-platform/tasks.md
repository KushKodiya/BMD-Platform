## 1. Project setup

- [x] 1.1 Scaffold a Next.js app in the repo and verify `npm run dev` serves a placeholder page
- [ ] 1.2 Create a Supabase project, add client config via env vars, and verify the app connects (a simple server-side query returns without error)
- [x] 1.3 Add dependencies (Supabase client, Resend) to package.json and verify install succeeds

## 2. Data model

- [x] 2.1 Create `teams` table (9 rows, each with a name and owning admin) and verify a seed inserts exactly 9 teams
- [x] 2.2 Create `players` table (name required, year and major nullable) and verify a NOT NULL constraint rejects a nameless insert
- [x] 2.3 Create `draft` table holding status (setup/in_progress/complete), the ordered team order, `turn_started_at`, and `notified_at`; verify a row can be created and read
- [x] 2.4 Create append-only `picks` table (pick index, team, player, timestamp) with a UNIQUE constraint on player; verify a duplicate-player insert is rejected by the DB

## 3. Access control

- [ ] 3.1 Configure Supabase Auth, seed the 9 admin accounts, and flag one as owner; verify the owner account also maps to a team
- [x] 3.2 Enforce role capabilities server-side (owner-only setup, admin-only own-team pick, viewer read-only) and verify a non-owner setup call and an out-of-turn pick are both rejected
- [x] 3.3 Add an admin "my account" screen to set own notification email; verify an admin cannot edit another admin's email

## 4. Snake turn engine (pure logic)

- [x] 4.1 Implement `teamOnClock(pickIndex, orderedTeams)` (odd rounds forward, even reversed) and verify unit tests for rounds 1-3 and both directions
- [x] 4.2 Implement draft-complete check (`pick_count == player_count`) and verify unit tests for exact-multiple and uneven-final-round player counts (e.g. 40 players / 9 teams)

## 5. Draft setup (owner)

- [x] 5.1 Build player-pool CRUD (add/edit/remove, name required) usable only before start; verify edits are rejected once the draft is in_progress
- [x] 5.2 Build draft-order UI with manual arrange and a "randomize order" button; verify randomize produces a complete ordering of all 9 teams with no duplicates
- [x] 5.3 Implement "start draft" that requires a non-empty pool and complete order, then locks pool and order and sets the first `turn_started_at`; verify start is refused on an empty pool

## 6. Picking (server-enforced)

- [x] 6.1 Implement pick as a single atomic transaction: verify on-clock team, verify player available, insert pick, set new `turn_started_at`, clear `notified_at`; verify concurrent double-submit cannot draft the same player twice
- [x] 6.2 Reject invalid picks (out of turn, already-drafted player, draft not in progress) without advancing the clock; verify each rejection path
- [x] 6.3 Mark draft complete when the last player is picked so no team is on the clock; verify status flips to complete on the final pick

## 7. Draft board

- [x] 7.1 Build the rounds-by-teams grid showing every pick, each team's roster, and the remaining available players; verify a viewer sees it without logging in
- [x] 7.2 Show the current on-clock team and give the on-clock admin a pick control; verify the control appears only for the admin whose team is on the clock
- [x] 7.3 Reflect a new pick on next load/refresh (async delivery); verify a recorded pick appears in the grid/roster and leaves the available list

## 8. Stale-turn nudge

- [x] 8.1 Implement an email sender (Resend) behind a channel abstraction (so SMS can be added later) that no-ops when the admin has no email; verify a stale turn with no email on file is skipped without error
- [x] 8.2 Add a Vercel Cron endpoint that finds an in_progress turn older than 4 hours with no `notified_at`, sends one email, and sets `notified_at`; verify a turn under 4 hours triggers nothing and a stale turn is notified exactly once
- [x] 8.3 Verify the nudge never advances the clock — the same team stays on the clock after notification until a pick is made

## 9. Deploy

- [ ] 9.1 Deploy to Vercel with Supabase/Resend secrets and the Cron schedule registered; verify the live site loads the board and the cron endpoint responds
- [ ] 9.2 Run an end-to-end dry run of a full small draft (few players, all 9 teams) and verify snake order, uneven final round, final picks, and completion behave per specs

## Verification status

Recorded so this stays honest about what was actually executed vs. implemented.

- **Executed in this environment:** 4.1/4.2 (8 unit tests pass via `npm test`), 1.1 (`next build` compiles all routes + middleware), 1.3 (`npm install` succeeds), full TypeScript typecheck passes (`tsc --noEmit`).
- **Implemented + build/typecheck-verified, but the task's live check needs the user's Supabase project to run:** 2.1-2.4 (SQL migration `supabase/migrations/0001_init.sql` defines the tables/constraints), 3.2/3.3 (RLS policies + `make_pick`/`update_my_email` RPCs + account UI), 5.1-5.3 (setup UI + `set_team_order`/`start_draft` RPCs), 6.1-6.3 (atomic `make_pick` RPC: row lock, unique player constraint, complete-on-empty), 7.1-7.3 (board/rosters/available pages), 8.1-8.3 (email channel + cron route). Run `supabase/migrations` + `seed.sql`, then exercise these against the live DB to close the loop.
- **Blocked — requires the user's cloud accounts (cannot be completed here):**
  - 1.2 create the Supabase project + confirm the app connects.
  - 3.1 run `scripts/setup-admins.mjs` (creates the 9 auth accounts, owner flag, team links) against the live project.
  - 9.1 deploy to Vercel with secrets + cron registered.
  - 9.2 live end-to-end dry run of a full draft.
