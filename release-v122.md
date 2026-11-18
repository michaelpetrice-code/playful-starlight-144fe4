# The Local v122 — unified Virtual Pub Tables (staging)

- Original official logo remains pixel-identical to the uploaded 2048×682 PNG. Compact beer-glass crop retained.
- The existing Virtual Pub Tables navigation now displays the v121 secure table interface *inside* the main app, replacing the legacy table UI in that section.
- The header link now points to the unified main-app tab.
- Existing secure table features: approval-based membership, roles, media uploads, reactions, moderation and table events.
- Standalone secure-tables.html remains as an internal compatibility page, embedded without a duplicate header.
- Legacy records have NOT been migrated or deleted. This release does not add comments, invitations, audit logs, video transcoding or venue-wide event unification.

## Required setup
1. Back up the site and Supabase database.
2. Run/review SECURE-TABLES-v121.sql if not already installed.
3. Deploy to Netlify **staging**, then sign in and select Virtual Pub Tables.
4. Test with owner, approved member and unapproved member; test uploads and table moderation.
5. Check phone layouts and whether the embedded table interface resizes as expected.

JavaScript syntax and archive integrity checked; live Supabase and browser flows NOT tested.
