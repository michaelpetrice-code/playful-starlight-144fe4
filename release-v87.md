# The Local v87 – Gameplay Reliability Update

This is an incremental gameplay update, **not** an OnlyGames-equivalent full rebuild.

- Word Search: fixes a bug that could produce an empty puzzle; words now generate correctly and selected answers stay highlighted.
- Battleships: computer target selection no longer treats the left and right edges of adjacent rows as neighbouring squares.
- Blocks: displays next piece, level and cleared lines, with scoring increasing by level.
- Darts: shows a recent-visit history including busts and score transitions.
- Pool/snooker physics, Solitaire, Ludo, crossword, quiz, multiplayer features and the wider app are retained without major engine changes.

Existing online multiplayer depends on configured backend services. No claims of full competitive rules, 3D simulation, matchmaking or parity with OnlyGames.

Deploy to Netlify staging, test all games on Android and desktop, and verify connected multiplayer services before replacing production.
