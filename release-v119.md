# The Local v119 — Solitaire Cards & Battleships Feedback

## Changes
- Solitaire: redesigned card faces with rank, suit, corner indices, large centre suit, red/black colours and patterned backs. Better mobile sizing and move counter.
- Solitaire: legal descending alternating-colour runs are checked before moving; waste recycling resets cards face down.
- Battleships: tracks each individual ship; displays a temporary (2.2-second) ship-sunk notification and a victory notification. Sunk squares are highlighted.
- Retains the existing v118 Games Room and The Local site.

## Limitations
- Solitaire is still a simplified draw-one Klondike: no undo, auto-complete, or drag and drop.
- Battleships is single-player target practice, not multiplayer.
- This release has syntax and archive checks, not end-to-end browser or phone testing.

## Deploy
Upload the ZIP to Netlify staging first. Test Solitaire and Battleships on desktop and mobile before replacing production. No new SQL required for these changes.
