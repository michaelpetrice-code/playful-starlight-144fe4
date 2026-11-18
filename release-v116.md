# The Local v116 — Community Competitions

## Included
- New community-competitions.html for venue tournaments, member registration, staff-verified leaderboards, and member invitations.
- Links from Games Room, main header and venue control.
- Existing game engines and venue features unchanged.

## Setup
1. Back up Supabase. Review and run COMMUNITY-COMPETITIONS-v116.sql in the SAME Supabase project as The Local. Check that platform_venues and platform_venue_staff exist.
2. Deploy the complete ZIP to Netlify staging.
3. Sign in using your existing Supabase member account on the new community page.
4. Staff with owner/admin/manager roles in platform_venue_staff can create tournaments and record scores.
5. Members can enter tournaments, send UUID-based invitations and see verified results.

## Important limits
- Existing pool/darts/etc engines DO NOT automatically submit scores. Staff enter verified points manually.
- Friend invitations are not an automated game matchmaking system.
- Badges are simple leaderboard milestones, not a full achievement engine.
- Browser/end-to-end testing and production security review are still required.
- This version changes only the front end and adds optional SQL; no live database has been modified.
