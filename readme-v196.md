# The Local v196 — Member location and contact analytics

Adds an owner-only, on-demand member contact directory to Administration → Analytics, including supplied town, county/region, postcode and country, email and phone when available, last sign-in and join date, search, location counts, and CSV export. Existing traffic and campaign reports are retained.

## Required setup
Run `INSTALL-V196-MEMBER-ANALYTICS.sql` in the same Supabase project. Upload the full ZIP to Netlify. Sign in as platform owner, open Administration → Analytics, then Load member directory.

## Privacy
No location permission prompts, IP geolocation, enrichment or new collection. Values are read from existing Supabase Auth user metadata; most may be blank. Contact access is restricted at the database RPC level using `local_is_owner()` and is not exposed to venue administrators. CSV downloads contain personal data and should be stored and shared securely. Verify lawful purposes, privacy notices, retention and member rights under UK GDPR before using these details for outreach. Do not treat having an email address as marketing consent.

## Limitations
Lists up to the 1,000 most recent accounts. Locations are user-provided only; no automatic accurate geographic analytics. Existing profile records in other tables are not merged. Browser and database end-to-end tests not performed.
