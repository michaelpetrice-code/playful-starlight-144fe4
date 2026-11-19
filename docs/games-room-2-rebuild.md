# Games Room 2.0 — rebuild and acceptance gates

Status: Development branch only. No production changes.

## Scope
All 14 game entries currently rendered by `arcade-gallery-v191.js` and `games-room-next.js` must be inventoried before implementation. No game may be labelled finished solely because it renders.

## Quality gates (each game)
- Appearance: detailed, consistent, responsive artwork comparable to an approved reference; no emoji/placeholders as primary game pieces.
- Gameplay: deterministic rule validation, complete legal moves, scoring, restart, win/loss states and edge-case tests.
- AI: three genuinely distinct difficulties, legal actions only, no impossible information access.
- Mobile: Samsung Android Chrome touch interactions, portrait and landscape, no clipping or accidental page scrolling.
- Reliability: loading/failure/asset fallback, resume where relevant, accessibility controls, no critical console errors.
- Multiplayer (where supported): server-validated turns, invitation, reconnection, race-condition and cheating tests; never claim verified without authenticated test sessions.

## Implementation order
1. Inventory the 14 actual games, source modules, assets and dependencies.
2. Establish a common arcade shell, asset pipeline, design tokens, game lifecycle, test harness.
3. Replace Solitaire with authentic original/licensed card faces and backs; implement Klondike stock/waste/tableau/foundations, draw 1/3, undo, hints, autoplay, scoring, win animation.
4. Replace Pool, Snooker, Darts with tested physics/scoring/rules.
5. Upgrade each remaining game independently.
6. Test all 14 on desktop and Android; review screenshots and gameplay with owner.
7. Stage only; production release requires explicit owner approval.

## Current source inspection
`games-room-next.html` loads `games-room-next.js?v=210`, `arcade-gallery-v191.js`, `flagship-games-v185.js`, `realistic-engines-v192.js`, `realistic-engines-more-v192.js`, and several CSS layers. Existing page explicitly disclaims complete professional rules and verified competitive multiplayer.

## Release policy
Never merge or deploy automatically. Record per-game pass/fail evidence and obtain approval before release.
