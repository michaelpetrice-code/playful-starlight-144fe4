THE LOCAL v61 — MODERN TWO-PLAYER GAMES

1. In the SAME Supabase project as The Local, run MEMBER-GAMES-v61.sql in SQL Editor.
2. Deploy contents of lads-local-pwa to the existing The Local Netlify site.
3. Two different members sign in on their own devices.
4. Open Games (Arcade), create Noughts & Crosses or Connect Four. Copy the invite link and send it to the other member.
5. Other member opens Games, pastes invitation code or link and selects Join match / Accept challenge.
6. Turns update every ~4 seconds while Games is open.

These are true online turn-based matches, not simulated opponents. Existing arcade games, tournament results and score-tracking are retained. Online matches require the database setup and authenticated users. Browser-to-browser live testing against the production Supabase project has not been performed.
