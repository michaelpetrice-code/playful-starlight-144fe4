# The Local v198 — Publish My App action

A prominent emerald-and-gold **Publish My App** action appears at the top of the existing **Venue controls** pane for authorised venue staff. It opens the existing Venue App Builder at `index.html?section=venue-app-builder`, which already provides preview, readiness checks, publish confirmation, sharing and unpublishing. The button does **not** publish immediately.

The card reads `local_builder_get` to show whether the app is live and whether the signed-in account has builder access. If the account has no active builder subscription, it displays a clear explanation. The server's `local_builder_save` and `local_builder_unpublish` permissions remain authoritative; the UI never grants subscriptions or publishes by itself.

## Install
Upload the **entire ZIP** to your existing Netlify site, replacing the previous deployment. Existing builder database setup (`INSTALL-V147-VENUE-APP-BUILDER.sql` and subsequent updates) must already be installed. No new SQL required for this version.

## Test
1. Log in as a venue admin and open Administration > Venue controls.
2. Confirm the launch card appears above the venue controls and its link opens the builder.
3. Test a subscriber with an active app-builder subscription and one without.
4. Publish a test venue from the builder after confirming; check its public URL, then unpublish.
5. Confirm a regular member cannot access venue administration or publish through the builder.

Note: Venue staff and builder subscribers may be distinct account roles in the current database. An administrator without an app-builder subscription cannot publish until their account has the correct entitlement. Live Supabase and Netlify behaviour has not been verified here.
