# The Local v195 — Personalised Member Home

The home screen now shows the signed-in member display name, community updates, upcoming community events, recent table posts from the existing group posts feed, and recent available marketplace listings from the existing `market_listings` table (subject to Supabase RLS). Includes quick actions and refresh. Empty/error states are explicit; nothing is fabricated.

**Scope:** The posts feed is limited to the currently selected community, not every venue. Table posts are filtered from that existing feed, and are not a replacement for a private tables permissions API. Friends-only feeds, cross-venue subscriptions, personalised ranking, and notifications require additional database relationships and policies; these are deliberately not claimed. Marketplace list links open the marketplace, not an individual listing.

**Install:** Back up your Netlify site and deploy the complete ZIP. No new SQL migrations. Test signed-in home, group switching, RLS, event dates, marketplace access, mobile and logout. No live tests have been run.
