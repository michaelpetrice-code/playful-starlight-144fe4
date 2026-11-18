# The Local v204 — five administrators per venue
This is a GLOBAL venue policy, not a special Coombe-only setting.
Every subscribed organisation can have up to five combined `owner` and `admin` accounts, including the founding owner.
Managers and staff do not count toward the five, and cannot automatically become administrators.
Only the existing owner can add/remove administrators in Venue Control Centre.
Administrators must have registered accounts; enter their Supabase Auth UUID.
No person, including the platform owner, is silently added to a venue. To include yourself, have the venue owner add your existing account as an admin (unless you already own that venue).
Deployment:
1. Upload complete v204 ZIP to Netlify.
2. Run INSTALL-V204-FIVE-ADMINS.sql in the existing Supabase project after the venue staff tables/policies.
3. Verify 4 admins plus 1 owner are accepted and a 6th admin is rejected at database level.
4. Verify different venues have independent limits, staff roles remain available and owners cannot be removed by normal staff UI.
The limit is enforced by a database trigger for all clients using the platform_venue_staff table. Separate legacy Coombe admin stores, if any, require a migration and are NOT automatically covered.
