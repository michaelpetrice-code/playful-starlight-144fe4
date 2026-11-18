# The Local v94 — Cue Physics Engine & Gameplay Foundation

## Implemented and connected
- New reusable deterministic fixed-step 2D cue physics (`cue-physics-v94.js`), with ball collisions, restitution, rolling drag, cushion bounces, pockets, shot-event logs, adjustable top/back spin and sidespin parameters.
- Local pool/snooker canvas now plays back simulated physics frames instead of the previous in-place simulation loop.
- Reusable adjudication helpers (`judgeEightBall`, `judgeSnooker`) with isolated automated tests for common fouls, pots, eight-ball outcomes and snooker shot scoring.
- Polished dark-wood and green-felt visual frame for local cue games and online cue view, accessible touch targets, responsive layouts.
- Existing online pool/snooker/darts, Connect Four and Noughts & Crosses modules and Supabase SQL preserved without database migrations.

## Important remaining work
- This is **not a complete rebuild of every game**. The new rules helpers are independently tested but the full local cue match state machine has not been replaced by them. Complex official rules (snooker free balls, miss and replay, break fouls, ball-in-hand placement, frame endings, etc.) are not covered.
- Existing Supabase SQL cue simulator remains separate from the new browser physics engine. The online version therefore does not yet share exactly the same physical calculations.
- Other game engines (Solitaire, Ludo, puzzles, pinball, dice, etc.) remain as in v93.
- Real online multiplayer cannot be described as **fully tested**: no live test credentials or two separate browser sessions were available. Online logic needs an integration environment, latency/reconnection tests, security review and actual two-user playthroughs.
- Do not deploy to production without manual browser tests and Supabase staging verification.

## Automated checks
Run `node cue-physics-v94.test.mjs` for deterministic simulation and rule assertions. Run `node --check arcade-engines-v79.js` for syntax.
