# The Local v90 — Online Cue Match Foundation

## Delivered
- Online pool and snooker lobbies, invite links, two-account match view and a shared table.
- **Server-authoritative, transactional shot simulation**: a PostgreSQL RPC validates turn, state version, angle and power; simulates fixed-timestep motion, collisions, cushion bounces and pockets; applies basic fouls, scores and turn changes; and commits settled ball positions. The browser cannot directly update match state.
- Supabase Realtime subscription with polling fallback, stale-shot rejection, and short interpolation between settled positions.
- Supabase migration `ONLINE-CUE-v90.sql` with authenticated RPC access, participant-only SELECT RLS and Realtime publication. Existing v89 online darts and v61 Noughts & Crosses / Connect Four remain.

## IMPORTANT: Still not official full-rules play
The authoritative engine is a **prototype**, not a certified physics/referee system. It does not implement full WPA 8-ball rules (nominated pockets, all legal break and ball-in-hand placement) or full WPBSA snooker (free balls, foul-and-miss, referee calls, complete endgame logic). Physics approximates equal-mass elastic balls, friction and cushions; there is no verified spin, throw, rail geometry or continuous collision detection. Shot animations interpolate between endpoints rather than replaying each collision frame. A cue shot can take several seconds in the database; Supabase SQL statement timeout and load must be checked.

## Installation
1. Deploy the ZIP to a **Netlify staging site**.
2. In the **same Supabase project**, run `MEMBER-GAMES-v61.sql` (if needed), then `ONLINE-SPORTS-v89.sql`, then `ONLINE-CUE-v90.sql` in SQL Editor.
3. Check `supabase_realtime` publication includes `local_member_games`, `local_online_darts`, `local_cue_matches`. Do not run schema changes on production without a backup.
4. Sign into two separate accounts on two devices. Create a match, copy the invite, join, play turns and check reconnect and foul outcomes.
5. Inspect Supabase logs and query duration; adjust statement timeout or move simulation to a dedicated backend if required.

## Verification
JavaScript syntax and ZIP integrity checked only. Live Supabase execution, browser gameplay, and multi-device testing were **not** performed.
