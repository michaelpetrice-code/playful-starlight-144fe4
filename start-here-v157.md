# The Local v157 — Virtual Pub Tables creation fix

1. Upload all site files to the existing Netlify deployment (do not upload just the JS file).
2. Open The Local, sign in, then select Virtual Pub Tables. Coombe Social Club is preselected when it is an approved venue and no other venue was saved.
3. Press **+ Create a Table**, enter a name and description, then press **Create Table & Pull Up a Chair**.
4. If the venue list is empty, or creation fails with a missing table/function error, run **INSTALL-V156-TABLES-REPAIR.sql** in the **The Local** Supabase project, matching the project URL in config.js. Do not run it in the Coombe app project.
5. Test with two separate member accounts before announcing it to members. The app requires Supabase access and permissions to work.

Changes: visible creation button, auto-select Coombe if no previous venue, clearer sign-in/database errors, cache-busted scripts. No existing tables or data are deleted. Live Supabase has not been tested.
