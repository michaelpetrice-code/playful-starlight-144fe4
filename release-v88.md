# The Local v88 — Competitive Gameplay Upgrade

### Included
- **Darts**: Player-versus-computer 301/501, three selectable computer skill levels, best-of-1/3/5 legs, double-out and bust rules, checkout hints, animated dartboard target display, match scoreboard and throw log.
- **Cue games**: More responsive friction/collision physics, shot feedback, pot counter, scratch penalties, improved score display. **These are arcade rules, not full official 8-ball or World Snooker Tour rules.**
- **Battleships**: Computer switches between checkerboard hunting and targeting adjacent cells after unsunk hits.
- **Online Noughts & Crosses and Connect Four**: Supabase Realtime subscription added to existing server-authoritative move RPCs, with four-second polling fallback. Requires existing MEMBER-GAMES-v61.sql setup, database replication publication and network connectivity.
- **Other games**: Existing Solitaire, Ludo, puzzles, pinball, dice and pub quiz retained. No new opponent AI for those games.
- New mobile-responsive darts score panel and controls.

### Limitations
This is a substantive incremental upgrade, **not verified parity with OnlyGames**. Snooker foul rules, ball-on selection, colour respotting, 8-ball suit assignment and match-level pool referee remain to be built. Cue sports and darts are local-device games; only Noughts & Crosses and Connect Four use online synchronized state. Online play requires Supabase configured correctly; Realtime is not guaranteed unless enabled for local_member_games.

### Test before publishing
Test cue-ball potting, scoring, dart bust/double-out and leg progression, AI difficulty, all other games, and two-device live match synchronization using separate accounts on Netlify staging.
