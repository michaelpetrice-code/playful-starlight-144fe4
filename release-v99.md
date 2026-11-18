# The Local v99 — Coombe Social Club theme and featured venue

Based on the **user-provided Coombe Social Club v42 ZIP**. No changes have been made to the Coombe app.

## Changes
- The Local now uses Coombe's deep forest-green backgrounds, warm cream panels, gold borders and accents, glossy green buttons, rounded tiles and matching navigation treatment.
- Existing The Local app.js, games, marketplace, chat, account, venue-application and admin modules are retained.
- Coombe Social Club is included as a **featured venue in The Local's directory**, even when the Supabase venue table has not been populated.
- The venue profile includes two actual venue room photographs extracted from the attached Coombe app's `coombe-home-rooms-clean.jpg` and a branded venue banner.
- The venue profile includes a working external link to the Coombe app at `https://stellar-mandazi-6aa7db.netlify.app/`, a link to the official website, and a Get a Table button.
- A Coombe venue card is shown in the directory; its View Venue Profile button scrolls to the profile.
- Optional `COOMBE-VENUE-REGISTRATION-v99.sql` registers the club in The Local's Supabase directory (requires deployment and the pre-existing venue schema). The public app includes the featured entry regardless of whether this SQL is run.

## Limitations and verification
- The site theme is inspired by the attached Coombe app, adapted to The Local's different layouts; not every pixel or icon is identical.
- The supplied photos show the club's concert room and lounge, not an exterior street view. They were supplied inside the Coombe app package.
- No Supabase changes or live deployment have been performed. No full browser visual or cross-device test has been completed.
- The Coombe app URL is taken from the user's earlier supplied Netlify URL; verify it remains the intended live URL before publication.
- External app links navigate to a separate app; shared authentication/content sync depend on existing deployed Supabase configuration and are not newly implemented here.

## Deployment
Upload this ZIP to a **Netlify staging site** first. Check home tiles, navigation, Venues > Coombe Social Club, View Venue Profile, Open Coombe Club App and Get a Table. Optionally run the included SQL against The Local's Supabase project to persist the venue record.
