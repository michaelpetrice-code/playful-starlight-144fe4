# The Local v193 — Gameplay rules and computer opponent refinement

This is an incremental upgrade of v192, retaining the 14-game single-page gallery.

- Battleships computer now uses checkerboard searching and adjacent-square targeting after a hit rather than purely random shots.
- Solitaire prevents moving unrevealed cards and moving a selected stack onto itself. Existing draw-one Klondike and foundation checks remain.
- Cue-sport pocket detection now occurs before cushion rebound to improve pocket capture near the rails.

## Still outstanding
Full official eight-ball/snooker refereeing, true 3D spin physics, professional darts turn handling, advanced solitaire undo and hints, comprehensive game tests, and production online multiplayer are NOT implemented.

**Multiplayer architecture needed:** Supabase Auth, server-authoritative rooms and game state, sequence-numbered commands, row-level security, reconnect/resume, anti-cheat validation, server-side tests and staging two-device verification. A browser-only patch cannot honestly certify reliable online multiplayer.

Back up and deploy the complete ZIP on Netlify. No new SQL required for these local gameplay changes.
