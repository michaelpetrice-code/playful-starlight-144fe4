# The Local v120 — Brand and Virtual Table Consolidation

- Official uploaded full gold logo applied to header, sign-in, venue sales page and phone mock-ups. Compact beer glass retained for small icons.
- Removed Chat, Private Chats and Chat & Media Settings from the primary navigation; legacy tabs redirect to Virtual Pub Tables. Existing chat records are **not deleted**.
- Virtual Tables include creator dashboard to rename, describe, close and moderate posts; append-only update/hide markers use existing chat post storage.
- Table feed supports image links, reactions, and HTTPS video **links** with inline playback. Direct video file upload is NOT implemented in this release.
- Who’s Up for It? supports event scope community/table/venue/platform. Venue/platform creation is restricted to existing community owners in this release, not a distinct platform-admin role. Table events require table creator ownership.
- Table events appear on the table and link to the event RSVP page.

## Cautions
The existing app uses group-scoped records, not separate secure per-table membership and RLS. Table privacy, invitation approvals, granular moderator permissions and actual video upload require a dedicated Supabase schema and security policies. This is a staging build; do not treat tables as confidential or release publicly before those controls are implemented and tested.

## Test
Open Home, phone mock-up and For Venues to verify branding. In staging sign in, create a table, open it, rename, post text/image/video URL, react, hide a post, create a table event, RSVP and close the table. Test on desktop and mobile. No new SQL required for this incremental release.
