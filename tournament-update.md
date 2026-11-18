# Weekly pool, snooker and darts tournaments

Deploy the entire `lads-local-pwa` folder to your existing Netlify site. No database SQL changes are required: tournaments use the existing `challenge` and `game_score` post kinds.

Open Tournaments, create a tournament for each sport, and ask players to join from their own accounts. When at least two have joined, all round-robin fixtures appear. Either participating player can report a winner. First result recorded counts. Separate sport leaderboards show wins for the current Monday–Sunday week; they automatically show a fresh week on Monday without deleting old data. Previous weekly leaders appear in Hall of Fame.

Important: Matches are played in person, not simulated. Results are self-reported and not tamper-proof; players should agree on disputed scores. App currently retrieves at most 200 latest posts per group, so old tournament history may become incomplete in very active groups. Push notifications require the separate setup described in PUSH-SETUP.md.
