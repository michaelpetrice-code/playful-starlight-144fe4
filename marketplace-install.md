THE LOCAL — MARKETPLACE INSTALLATION

1. IMPORTANT: In your existing Supabase project, open SQL Editor, paste the entire MARKETPLACE-SETUP.sql file and run it. This creates the global listings, private messages, reports, private photo bucket, and access policies. Do not rerun the old schema.sql.
2. Extract this ZIP and drag the lads-local-pwa folder into your existing Netlify Deploys page.
3. Sign in to The Local, open More > Marketplace, and create a test listing with a photo.
4. Sign in with a second account (preferably in a different group) and confirm that the listing is visible, a private enquiry can be sent, and the seller can reply via Messages & offers.
5. Test marking the listing Sold and submitting a report. Moderators can view reports in Supabase Table Editor > market_reports (there is no in-app moderator console yet).

WHAT IS INCLUDED
- Global authenticated Marketplace, independent of private groups.
- Sale, Free and Swap listings, up to 5 photos each (5 MB each), category, condition and collection area.
- Search by item, description or area; category filter; My listings.
- Private seller enquiries and offers, inbox with replies, Sold/Available, remove listing, reporting.
- No integrated payments. Users arrange payment/collection themselves.

IMPORTANT LIMITATIONS
- No in-app moderator dashboard or automatic scam detection. Reports need manual review in Supabase.
- No real-time notifications for marketplace messages; users check the inbox.
- Do not use this for regulated or prohibited goods. Protect your privacy: use a general collection area, not a home address.
- The app code has passed JavaScript syntax checks but has NOT been tested against your live Supabase project.
- The existing Supabase project URL and publishable key in config.js are retained; never place a service-role key in client code.
