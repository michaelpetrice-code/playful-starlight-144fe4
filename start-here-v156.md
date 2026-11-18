# The Local v156 · Toolbar and Virtual Pub Tables repair

1. Open The Local’s Supabase project and go to **SQL Editor → New query**. Check the project matches the URL in the deployed site's `config.js`. This package points to project reference `huuqwjmztqurnyyokrxd`.
2. Paste the full contents of `INSTALL-V156-TABLES-REPAIR.sql` and select **Run**. The result should show `venue_directory_ready` and `table_creation_ready` as true, and at least one selectable venue. The script creates any missing tables, adds Coombe Social Club if absent, and tells the API to reload its schema. Existing tables, messages and memberships stay in place.
3. Deploy the v156 site files to Netlify and reload the page. Check **Virtual Pub Tables → Choose your venue → Set up a new table → Pull up a chair**. Check all five toolbar buttons on a phone and desktop, then open **More** and check that it clears the toolbar.
4. For a table created before venue selection was introduced, choose its venue, then use **Place my existing tables**.

Use the matching Supabase project and deployment when testing staging or production. If the repair query returns an error, save the exact error text for troubleshooting.
