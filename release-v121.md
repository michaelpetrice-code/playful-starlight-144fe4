# The Local v121 — secure table foundation (staging)

## Included
- Original supplied 2048 × 682 gold/emerald logo preserved as `icons/the-local-official-v120.png`; a separately cropped beer glass is in `icons/the-local-beer-only-v121.png` for compact placements. No regenerated or approximated logo.
- New **Virtual Pub Tables** page (`secure-tables.html`) linked from home. This is a separate secured implementation; legacy table/chat UI is still present in parts of the original app and is **not yet replaced**.
- Member requests, approval, moderation roles, bans, post hiding, reactions, table posts, media uploads (JPG/PNG/WebP/MP4/WebM, up to 50 MB), and table events with RSVP.
- Private Supabase Storage bucket and RLS-backed membership controls.

## Install (required)
1. Back up your existing Supabase project/database.
2. Run `SECURE-TABLES-v121.sql` in Supabase SQL Editor (after existing `schema.sql`). Review policies with a database administrator first.
3. Upload the ZIP to **Netlify staging**, not the live domain.
4. Sign in through the main app, then visit `secure-tables.html`. Create a table as member A, request to join as member B, approve as A, verify B can see content and an unapproved member cannot.
5. Test a 5 MB MP4 and a JPG, signed playback, reactions, moderator actions, event RSVPs, and mobile controls.

## Limits / not yet complete
- This is a working-code staging foundation, **not** a finished Facebook-equivalent group management dashboard or a fully migrated legacy Virtual Pub Tables system.
- New table membership is private; table names/descriptions remain discoverable to signed-in members.
- No transcoding, streaming adaptation, virus scanning, reporting/appeals, invitation links, comment threads, or audit logs yet.
- No browser/live Supabase end-to-end tests were performed; deployment requires SQL setup.
- Venue/platform-level Who's Up for It? events still use the existing implementation and are not merged into the new secure table events.
- Media URL expires after one hour; reload to obtain a fresh signed URL.
- Old chat and table storage remain untouched to avoid data loss.
