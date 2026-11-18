# The Local v32 – Community & Venue Hub

## New sections
- **Virtual Pub Tables:** create topic tables, join text discussions, close your own table.
- **Who’s Up for It?:** suggest activities with dates and locations, RSVP as Going or Interested, cancel your own plan.
- **Venue Hub:** community owners can register one venue and publish announcements. All members can see venues in their selected community.

## Deployment
Extract ZIP, drag `lads-local-pwa` folder to Netlify Deploys, refresh installed app. No new Supabase SQL required; uses existing `posts.kind=chat` with feature tags.

## Current limitations
This is a community-scoped beta, not geographical discovery. No live voice/video, real-time member count, payments, bookings or venue identity verification. Shared updates need refresh (the existing app refreshes after posting). The venue owner role is the owner of the selected Supabase group; it is not a separate verified pub-manager role. Group owners should only register venues they are authorised to represent. Demo data is local to each device.

## Safety and access
The existing Supabase policies limit records to group members. Post author/owner checks in the new UI are not a substitute for server-enforced row-level permissions; for production, add dedicated tables and server-side policies for venue verification, moderation and ownership.
