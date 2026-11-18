# v82 simple admin panel
1. Deploy ZIP to a staging Netlify site.
2. In Supabase SQL Editor, run SIMPLE-ADMIN-v82.sql. This requires the existing is_local_admin() RPC and an approved admin account.
3. Sign in as an approved administrator. A small cog appears bottom right. Other members cannot see it.
4. Use the form to add/edit/delete events, prizes, dates and notices. Published events and prizes display on the Events page.
5. Admin data is shared through Supabase and protected by row-level security. Existing Coombe companion app content is not automatically updated; separate sync integration is needed.
6. Test saving and viewing with two accounts before replacing production.
