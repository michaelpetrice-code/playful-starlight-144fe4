# The Local — Phase 2 Staging Venue Control Centre

This release is a copy of The Local v102 plus a **separate staging-only venue control dashboard** at `/venue-control.html`. It does not modify the production Supabase URL in `config.js` and does not change the live apps.

## Setup
1. In **The Local - Staging** Supabase SQL Editor, run `PHASE2-STAGING-SECURITY.sql` once.
2. Deploy the ZIP to a **separate private Netlify staging site**. Do not overwrite the production site.
3. Visit `https://your-staging-site.netlify.app/venue-control.html`.
4. Enter your **staging** Supabase URL and its **publishable/anon key** (never the service-role key), then sign in with the staging owner account you created.
5. Test feature switches, draft/published announcements, staff listing, and audit entries.

## Scope and limitations
- Feature visibility switches save to `platform_venue_features`; existing member screens in The Local and Coombe are **not yet connected** to these switches. They will not hide those screens until the next integration phase.
- Announcements are managed in staging only; member-facing announcement feeds are not yet connected.
- Staff additions use an existing user's UUID. Owners can add staff/admin/manager and remove non-owners; no self-granting owner access is allowed through the dashboard.
- Member renewals, booking calendars, payments, and shared cross-app login are **not yet implemented**.
- The dashboard signs in directly to the staging project and does not store the entered credentials or key in browser localStorage.
- Security policies are installed but **cross-venue access tests using multiple authenticated accounts have not yet been performed**. Do not deploy this as production-ready.
- Existing Phase 1 SQL helper functions are SECURITY DEFINER; a comprehensive security review is still required before production rollout.
- Existing The Local v102 homepage still points to its original production project; **use only the dedicated `/venue-control.html` page for staging tests**.

## Test plan
1. Owner logs in and can see only their assigned venue.
2. Owner toggles `games` off then on; database `platform_venue_features` reflects the changes.
3. Owner creates and publishes an announcement; audit trail shows INSERT/UPDATE with owner actor UUID.
4. Ordinary user without a staff role cannot load the dashboard.
5. Add a second test venue and second test user; confirm neither can read or change the other's venue records.
6. Check SQL Editor audit entries may show blank actor IDs, unlike authenticated dashboard actions.

Do not share your password, service-role key or access tokens.
