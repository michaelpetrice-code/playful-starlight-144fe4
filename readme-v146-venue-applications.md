# The Local v146 — Venue Applications

## Included
- A dedicated "Venue Applications" page with a public-facing (signed-in) application form.
- Venue name, type, town, contact email and description.
- A platform-administrator-only dashboard with status filters, totals, approval and decline controls.
- Approval publishes a venue into the existing Venue Hub directory.
- An audit record for each approval or rejection, stored securely in Supabase.
- Matching emerald-and-gold responsive styling.

## Required setup
1. Deploy this ZIP to Netlify staging, **not production**.
2. In the same Supabase project used by The Local, run `INSTALL-V146-VENUE-APPLICATIONS.sql` in SQL Editor.
3. Open Supabase Authentication > Users and copy the verified platform owner's UUID.
4. Run `insert into public.local_venue_admins(user_id) values ('YOUR-VERIFIED-UUID') on conflict do nothing;` replacing the placeholder.
5. Sign in to The Local with the owner account and visit Venue Applications.
6. Test a new application with a different signed-in account, then approve it as the platform owner and check Venue Hub.

## Important limitations
- Prospective applicants must register/sign in to The Local first.
- Approval adds a public directory entry, **not** an automatically provisioned branded app, subscription or billing account.
- Ownership verification before approval is the platform owner's responsibility.
- Photos, custom logos, contact workflows and status emails are not implemented in this release.
- SQL has not been executed against your Supabase account; staging browser and database testing remain required.
- Existing Venue Hub application forms remain available for compatibility; the new dedicated page is the recommended entry point.
