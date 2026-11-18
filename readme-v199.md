# The Local v199 — AI App Studio

## Changes
- Six one-click starter designs: pub, social club, sports club, music venue, community centre and working men’s club. Existing cards are retained; confirmation is required before applying a starter to an edited draft.
- Expanded local media library: existing bundled photography/artwork plus 86 new original SVG emoji-style icon badges. Search across names and tags, filter categories and type, save favourites locally.
- Prominent shortcut to the existing AI setup assistant. Actual generative suggestions depend on the existing `venue-builder-ai` Supabase Edge Function being deployed and configured.
- Expanded readiness checks before publishing. Existing server-side subscription checks and save/publish RPC are unchanged.

## Deploy
Upload this entire ZIP to the existing Netlify project. No new SQL required. Clear cached pages or reload. Sign in with an eligible venue subscription and open Venue App Builder.

## Limitations
No new external stock photos were licensed or downloaded. Photos and game artwork are reused from assets already bundled with The Local; confirm rights to reuse them for subscriber apps. Emoji icon appearance can vary by device. AI generation is not available unless the existing Edge Function is configured. No live database publishing test was performed.
