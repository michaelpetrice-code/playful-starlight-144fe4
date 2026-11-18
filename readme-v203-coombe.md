# Coombe Social Club · Founding venue builder app

## What is included
- A preview at `coombe-builder-preview.html` based on The Local's bundled Coombe banner, concert room and lounge images.
- A Coombe App Builder draft seed covering What’s On, tickets, room hire, bingo, Chase the Lady, rewards, gallery, games and contact.
- An ongoing **complimentary licence** entitlement in Supabase. This is not a Stripe payment, not a Stripe paid subscription and creates no invoice or charge.
- Existing Coombe Social Club standalone app remains linked and unchanged.

## Required steps
1. Back up The Local's Supabase project. Deploy the full ZIP to a staging Netlify site first.
2. Confirm the intended Coombe app administrator has registered and verified their email in The Local Supabase Auth.
3. Edit `INSTALL-V203-COOMBE-COMPLIMENTARY.sql`: replace `REPLACE_WITH_COOMBE_ADMIN_EMAIL` with that email. Run it once in Supabase SQL Editor with administrative privileges. It will fail without the email.
4. Sign in as that account, open Venue App Builder and inspect the Coombe draft. Replace placeholder links with real feature URLs and review all club text and images.
5. Publish only after Coombe approves the content. Then optionally set `builder_app_slug='coombe-social-club'` on the existing Coombe directory record to route the venue profile to the new builder app.
6. Test the new builder link and existing standalone app, login, admin panel, room bookings, tickets, rewards and members before switching any public links.

## Limitations
The builder is not a full copy of the separate Coombe app: member login, membership entry/NFC, rewards redemption, ticket sales and administrative workflows remain in the existing app and are not migrated by this package. Photos are existing The Local bundled Coombe images; they should be checked against the current club branding. The new app is a web app/PWA-style page, not an app-store listing.
