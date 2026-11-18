# The Local v200 — Multi-Industry AI-Assisted Studio

## Included
- Industry setup for pubs, sports clubs, community centres, veterans associations, charities, entertainment venues, cafés/restaurants, and local retail businesses.
- One-click, confirmation-protected industry starters that preserve existing content and never publish automatically.
- 48 new original locally hosted SVG icons for eight industry collections; the existing v199 media library remains.
- Industry-aware library recommendation filter (can be turned off), plus existing search, favourites and image uploads.
- Industry-specific naming guidance for Virtual Tables / Pull Up a Chair, with a link to the existing tables page.
- Existing AI Edge Function, publish checks and subscription validation are retained.

## Important limitations
- The studio's industry starters are deterministic templates; actual AI-generated suggestions still depend on the configured `venue-builder-ai` Edge Function.
- This release does NOT create industry-isolated virtual table communities, new sports fixtures engines, new payment modules, or autonomous platform administration. Those require backend schema, RLS, moderation and end-to-end testing.
- Existing bundled photographs are reused. Confirm licensing before allowing reuse across subscriber apps; no new stock photography is included.
- Server-side publishing was not tested against live Supabase credentials.

## Deploy
Upload the entire ZIP to the existing Netlify site. No new SQL for these UI-only enhancements. Test using a subscriber account, preview, save draft, and verify publish and unpublish against your own project.
