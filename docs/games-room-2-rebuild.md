# Games Room 2.0 — implementation and verification

Updated 20 November 2026. Development and isolated staging only; no Games Room production deployment yet. Michael has authorised publication when the remaining checks pass.

## Implemented
- Deterministic pool/snooker shots, collisions, cushions, spin, legal targets, fouls, ball in hand, colour respots, scores and computer turns. Accessible angle/power/Shoot controls supplement pointer aiming.
- Server-authoritative invitation matches for noughts, connect four, Reversi, Battleships, darts 301/501, pool and snooker. The server derives scores and state; clients send moves and expected versions only.
- Private match storage; participant-only version notifications; hidden Battleships fleets; row locks and version compare-and-swap; reconnect and polling fallback.
- Klondike draw one/three, legal sequences, foundations, undo, hints, autoplay and saved deals with illustrated cards.
- Shared tested rules for 2048, Snake, word paths and Battleships computer targeting. Difficulty controls for computer games; illustrated memory cards.

## Evidence
- 39 automated rules/integration assertions pass locally (Node).
- Staging SQL checks cover membership, wrong turns, stale/missing versions, replay and service-only access.
- Three synthetic staging accounts exercised unauthenticated rejection, outsider rejection, win, reconnect and legal moves in all eight online modes over HTTP.
- Concurrent requests for the same version commit exactly once. Real Supabase Realtime sends only version metadata to a participant and none to an outsider.
- Browser: all 14 games launch without application console errors; all fit 390×844 and 844×390 CSS viewports. This is not a physical Samsung touch test.
- Browser: two synthetic players joined an invitation, played a complete noughts match and recovered the final board/result after reload through the polling fallback.
- Browser: pool shot animation and computer reply completed; darts 301 finished on a double in six darts.

## Remaining release gates
- Complete functional browser checks for each remaining game, including resume/restart and input behaviour.
- Physical Android touch and visual-quality review remain unverified. Do not describe preview viewport checks as device testing.
- Snooker free-ball, miss and referee discretion are not automated; these are casual browser rules, not professional officiating.
- Production database/service promotion and live authenticated multiplayer smoke test have not happened.
- No ranked, cash-prize, subscription or paid API service is enabled by this rebuild.

## Staging setup
Apply games/install-multiplayer.sql, then games/install-realtime.sql to the intended project; deploy games/server/index.ts as arcade-game with the matching games/*.mjs and cue engine dependencies. The Edge function validates bearer tokens itself. Never ship service-role credentials to a browser.

Tests: `node --test games/*.test.mjs tests/games-room-2-*.test.cjs`.
HTTP QA scripts use ARCADE_QA_FIXTURES pointing to an external private directory containing arcade-qa-public.json and arcade-qa-private.json. Use disposable staging accounts only; never commit fixtures or tokens.
