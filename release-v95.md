# The Local v95 — Shared Cue Engine & Referee Integration

## Changes
- Local pool and snooker now call the new pure referee state machine after each simulated shot. The old duplicated local referee logic has been removed.
- Local referee tracks turns, player groups, scores, ball-in-hand, pots, phase and frame result.
- New Supabase Edge Function `cue-shot` executes the **same JavaScript physics and referee modules** as local games. This replaces the separate PostgreSQL physics simulator **once deployed**.
- Version-checked, row-locked SQL commit accepts settled state only from `service_role`. Old authenticated `local_cue_shot` RPC is revoked to prevent bypass.
- Existing Supabase Realtime and polling update the online client after committed shots.
- A live two-account test script is included for an actual Supabase staging project.

## Critical setup (required; ZIP alone is not enough)
1. Use a **test Supabase project** and back up the database.
2. Ensure `ONLINE-CUE-v90.sql` is already installed.
3. Run `ONLINE-CUE-EDGE-v95.sql` in the Supabase SQL Editor.
4. From the extracted website root, run `supabase functions deploy cue-shot --project-ref YOUR_PROJECT_REF`.
5. Deploy the website ZIP to a Netlify staging site. The Edge Function automatically receives Supabase environment secrets when deployed through Supabase; never put service-role credentials in the browser or Netlify public files.
6. Verify the Supabase project's API settings, Realtime publication for `local_cue_matches`, and two users.
7. Run the live test (with TEST accounts): `SUPABASE_URL=... SUPABASE_ANON_KEY=... PLAYER1_EMAIL=... PLAYER1_PASSWORD=... PLAYER2_EMAIL=... PLAYER2_PASSWORD=... node test-two-player-v95.mjs`
8. Test a complete pool and snooker match on two separate phones, including connection loss, rejoin, duplicate shot attempts, latency, fouls and game completion.

## Test results in this build environment
- 11 referee scenario assertions PASS.
- 11 deterministic physics/rule assertions PASS.
- JavaScript syntax and ZIP integrity PASS.
- **Live two-player integration tests NOT RUN** because no configured test Supabase project, authenticated test accounts or deployment access were supplied.
- Edge Function deployment and SQL migration NOT RUN.

## Remaining official-rules gaps (not production-complete)
- Pool: full WPA break options, ball-in-hand placement by player, push-outs, intentional fouls, re-racks, 8-ball-on-break adjudication and shot-call rules.
- Snooker: nominated colour UI, free-ball, foul-and-miss replay, touching balls, respotted black and full end-of-frame handling.
- Advanced cue physics remains an approximation rather than validated physical billiards. Spin is approximate.
- Online replay currently animates between settled positions, not the full server-produced shot frames.
- Other games and their online modes have not been rebuilt or end-to-end tested.
- Supabase Edge Function is server authoritative **only after SQL migration and function deployment**.

**Do not treat this release as production-ready or as fully official-rules-compliant until the above work and live integration testing are completed.**
