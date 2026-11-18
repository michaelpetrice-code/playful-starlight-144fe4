# The Local v123 — Table community upgrade (STAGING ONLY)

## Added
- Threaded-by-post comments, post reports and moderator report review.
- One-use, seven-day table invitation codes (share privately).
- Owner/moderator audit dashboard and automatic member-management audit trigger.
- Explicit SQL legacy migration with a separate preview and commented execution section.

## Install
1. Back up Supabase. Ensure v121 SQL was applied.
2. Run TABLES-v123.sql in the Supabase SQL editor.
3. Inspect MIGRATION-v123.sql PREVIEW queries; review old post data fields.
4. Only when satisfied, copy execution statements into a new query (remove comment markers).
5. Deploy ZIP to Netlify STAGING and test with owner/member/outsider accounts.

## Limitations
- Legacy migration handles groups, memberships and text chat posts only. Photos, attachments, events and game data are not migrated. Existing data is not deleted.
- Legacy group memberships may include people who joined using invitation codes; verify privacy and membership before enabling imported tables.
- Reports are visible to table moderators; no platform-wide moderation dashboard.
- Invitation code is a bearer secret, so share privately.
- SQL, runtime and RLS require live testing; no production validation performed.
