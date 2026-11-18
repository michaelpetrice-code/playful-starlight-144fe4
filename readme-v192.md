# The Local v192 — Interactive Game Engine Upgrade

Based on v191 complete website. The single-page 14-game gallery and its individual illustrated preview images are preserved.

## Replaced game experiences
- Eight-Ball and Pool Physics Practice: HTML canvas cue-sport table with aim by dragging back, power slider, ball-to-ball collisions, rolling friction, cushion rebounds, pockets, scratch and rack reset.
- Snooker: distinct canvas table and red/colour rack, collision practice and pot tracking. This is practice, NOT official referee rules or complete snooker scoring.
- Darts 501 and 301: circular board with 20 segments, ring-based scores, trebles, doubles, bull, double-out and a basic computer opponent.
- Solitaire: shuffled 52-card Klondike draw-one with face-up columns, alternating colour descending moves, foundations and stock recycling. Select a card then tap its destination.
- Battleships: independent randomly placed fleets (5,4,3,3,2), 10x10 boards, hit/miss, sunk detection and a basic computer opponent.

## Limitations
- The cue-sport simulation is 2D approximation, not a full professional pool or snooker rules engine. No ball spin, authoritative referee, turn-based competitive opponent or verified online sync.
- Darts is pointer-location scoring, not gesture/trajectory physics. Computer opponent is basic and leg/turn adjudication is simplified.
- Solitaire does not include advanced features such as undo, hint search, or guaranteed-solvable deals.
- Battleships auto-places ships, and AI shoots randomly rather than using a sophisticated search strategy.
- Existing multiplayer systems are unchanged and have not been verified.
- The code has passed JS syntax checks; actual browser gameplay, phone compatibility and live deployment have NOT been tested.

## Deploy
Back up the current website, upload this entire ZIP to the existing Netlify site, and open /games-room-next.html.
No SQL migration is required.
