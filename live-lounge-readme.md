# The Local v39 — live profiles, photos and multiplayer

1. In your EXISTING Supabase project, run `schema.sql` first if the original schema has never been installed. Then run `LIVE-LOUNGE-SETUP.sql` in SQL Editor. Do not paste secret keys into the app.
2. Check `config.js` uses the same project URL and *publishable* key as your existing app. Do not replace your working database or users.
3. Deploy the `lads-local-pwa` folder to your existing Netlify site. Reopen/refresh the installed PWA to update its cached files.
4. Sign in on phone A and B with DIFFERENT Supabase accounts, both joined to the SAME community. On Account, each person uploads and saves their own profile photo. Open Get a Table, select the same venue and table. Send a message on each phone so both appear around the table. Refresh and check photos persist.
5. In table chat, use **Upload a photo** and Send. Photos go into the existing private `pub-photos` storage bucket; image links currently have a 7-day signed URL lifetime. For permanent display, the app needs to store object paths and renew signed URLs; treat this as a remaining limitation.
6. Under Live Multiplayer, start Noughts & Crosses or Connect Four. Join from the other phone, take alternating turns. Moves are validated in the database and realtime events refresh the game board. If realtime is blocked, tap Refresh game.

## Important limitations
- Chess, draughts, cards and blackout are still the pre-existing on-device games. Only Noughts & Crosses and Connect Four are synchronised between phones in this release.
- Member avatars around the table appear for members who have sent a message in that table; this is not yet live online-presence tracking.
- Users need to be signed in and belong to the same Supabase community. Local demo mode does not sync.
- Avatar photos are publicly accessible through their unguessable URLs; do not upload sensitive photos. Table photo objects remain in private storage, but shared signed URLs can be opened by anyone who has the URL until they expire.
- Live games rely on your existing community membership schema. If you have customised your database, review the SQL before running it.
