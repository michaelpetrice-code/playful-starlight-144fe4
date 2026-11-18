THE LOCAL v104 — ADMIN COG (STAGING ONLY)

Fix: The Venue Control Centre now has a bottom-left cog on The Local home screen. The cog is hidden while the sign-in gate is displayed.

Important: The cog is a navigation shortcut, NOT an authorisation mechanism. The venue-control.html page requires a separate staging Supabase login and verifies owner/admin/manager membership via database RLS. The cog may be visible to ordinary signed-in members, but they cannot see the dashboard without valid admin credentials.

The Local app itself still uses its existing production Supabase authentication; shared SSO is NOT yet implemented. Do not deploy this package over the live site.

To test: deploy to a separate Netlify staging site; log into The Local with its existing account; click the bottom-left cog; enter the STAGING Supabase project URL, public key and your staging owner credentials. Never enter a service-role key.

Existing legacy admin interfaces within The Local have not been removed; their permissions need a separate audit before declaring all admin controls hidden.
