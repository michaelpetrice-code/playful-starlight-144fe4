# Coombe Social Club — flagship venue quality plan

**Status:** Review and proposed improvements only. Do not replace or remove existing club features. The standalone Coombe app source/deployment is not yet confirmed in this repository.

## Preserve existing features
Tickets, room hire, Chase the Lady, kids' bingo, What's On, suggestions, news, rewards, buy-a-round, membership, guest/member access, admin permissions, safety reports, games link, and shared content with The Local.

## Release priorities
1. **Reliable access:** test member login, password reset, admin cog, profile photo upload, session restoration and guest browsing on Android and desktop.
2. **Beautiful first impression:** professionally cropped venue photography, consistent typography, accessible contrast, responsive tiles, prominent What's On, tickets and room hire.
3. **Conversion showcase:** clear club branding, upcoming event cards with share links, one-tap enquiries and a subtle “Powered by The Local” link to the venue-app builder.
4. **Operational simplicity:** one Venue Control Centre with role-based admin access (up to five authorised admins), editable hours, feature visibility, event publishing and clear success/error messages.
5. **Payments and rewards:** verify payment webhooks, ticket redemption, duplicate-use prevention and reward stamp auditing; never grant entitlements based only on a client-side redirect.
6. **Safety and privacy:** Supabase RLS and venue isolation, least-privilege roles, consent-aware notifications, rate limiting, accessible reporting and retention policies.
7. **Digital membership:** support QR/barcode entry only after verifying compatibility with the club's reader; do not claim that Google Wallet or NFC can emulate an existing MIFARE Ultralight EV1 card.
8. **Demo readiness:** seed a *separate* demo venue with sample content, clearly labelled, without exposing real member data. Use an owner-approved publishing checklist.

## Verification gates before launch
- Every tile routes to a working page; no blank screens or broken back-navigation.
- Venue administrators can create, edit, publish and unpublish an event and see it in member and guest views.
- Venue feature toggles persist across refresh and are enforced server-side.
- Member uploads save, display and obey private storage access policies.
- Ticket purchase, cancellation/refund and redemption are reconciled with Stripe.
- Mobile layout, accessibility, loading/error/empty states and slow-network recovery tested.
- Existing Coombe functionality passes regression checks before any replacement is deployed.

## Dependency
Locate the authoritative standalone Coombe source repository/Netlify site and confirm which Supabase project owns its data before changing production code. The Local's read-only `coombe-sync.js` is **not** the Coombe app itself.
