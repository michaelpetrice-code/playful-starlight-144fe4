# The Local v201 — Industry Communities + Platform Manager
## Install
1. Deploy the full v201 ZIP to the existing Netlify project.
2. In the SAME Supabase project, run INSTALL-V201-COMMUNITIES.sql after the earlier tables and owner SQL.
3. Sign in as the verified platform owner, open Owner Dashboard and use Community Overview.
4. Open secure-tables.html, select an approved venue, and verify its industry-specific title and existing moderation workflow.
5. Test with two separate venue accounts and confirm private content cannot cross venues.
## Included
- Eight industry-sensitive community labels on the existing venue-scoped Virtual Tables interface.
- Existing membership requests, moderation, posts, chat, invitations and table events remain in use.
- Owner-only, database-enforced aggregated community overview.
- Rule-based platform manager suggestions for missing or inactive communities.
- Subscriber overview RPC limited to communities in which the signed-in user owns a table.
## Limitations
- Not a fully autonomous AI manager; AI content generation needs a secure server-side AI provider.
- Subscriber organisation-wide administration is NOT yet enforced: table owners/moderators retain existing table-specific permissions.
- No automatic subscription provisioning, publishing or outbound messaging.
- Existing historical SQL may have overlapping policies; test in staging before production.
- Photos and industry-specific asset libraries are unchanged from v200.
