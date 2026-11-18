# The Local v89 – Cue Rules, Physics and Live Darts Foundation

## Delivered
- Pool: two-player alternating turns on the same device, open-table solid/stripe assignment, first-contact foul detection, scratches, eight-ball win/loss checks, and ball-in-hand approximation.
- Snooker: red/colour phases, first-contact foul checks, colour respotting and sequential colour clearance, and score/turn tracking.
- Cue physics: multiple collision substeps, elastic ball contacts, rolling friction, adjustable cue-spin approximation, collision/pot feedback.
- **Online darts**: real two-account 301/501 matches, invitation links, server-enforced turn order, double-out and bust checks, score tracking, Supabase Realtime updates with polling fallback.
- **Online Noughts & Crosses and Connect Four**: SQL migration enables Supabase Realtime publication on `local_member_games`; existing server-authoritative moves remain in place.

## Required Supabase setup
1. Run existing `MEMBER-GAMES-v61.sql` if not already installed.
2. Run **`ONLINE-SPORTS-v89.sql`** in the same Supabase project's SQL Editor.
3. Check Authentication email login, Row Level Security and Realtime publication.
4. Use two separate signed-in accounts on different devices to test online darts and the member challenges.

## Important limitations
- Pool and snooker are **enhanced local arcade rules, not full official tournament implementations**. The pool model does not yet fully implement nominated shots, all foul variants, cushion-after-contact, all ball-in-hand placements or rack officiating. The snooker model does not yet cover free balls, foul-and-miss, re-racks, exact end-of-frame penalties or all referee decisions. Spin is an approximation, not a professional billiards physics model.
- **Online pool and snooker are NOT playable over the network in this release.** Those require an authoritative server-side physics/referee engine, shot-event replay and deterministic state verification; claiming synchronisation from client snapshots alone would mislead users and invite cheating.
- Online darts uses **tap-entered ring/number results**, not remotely verifiable physical dart positions. It is turn-synchronised, not simultaneous live aiming. Only one leg per online match; best-of series remains local.
- Realtime depends on successful SQL execution and live Supabase configuration; it cannot be enabled on the user's account from a ZIP.
- Browser and two-device integration tests have not been run; validate on a staging Netlify deployment before production.
