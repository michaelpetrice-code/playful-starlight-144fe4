# The Local v118 — Games Room Engine Expansion (staging)

This release builds on v117 and adds three new playable engines: Klondike-style draw-one Solitaire (stock, waste, tableau and foundations), Blocks 2048 (swipe, arrow keys, touch buttons), and Reversi (legal-move capture logic and a computer opponent). Existing seven v117 preview games are retained.

## Deployment
Upload this ZIP to the Netlify **staging** site only. Open `games-room-next.html` or use the New Games Room link on the homepage. No database migration is required for these three browser-local games.

## Current limitations
This is an incremental engine expansion, not the finished full games overhaul. Solitaire does not include undo or automatic win detection beyond completed foundations; Reversi AI is heuristic rather than tournament strength. Online multiplayer, server-authoritative scoring, game-to-tournament verification, pool/snooker and Ludo rebuilds remain outstanding. These games do not save scores to Supabase.

## Verification
JavaScript syntax and package integrity are checked during packaging. Real-device gameplay and end-to-end Netlify/Supabase testing have not been performed.
