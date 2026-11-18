# Profile save diagnostics v164

This update corrects the misleading success message: it reports each failed stage and verifies the saved Supabase Auth metadata. It also limits oversized files, shows a clear saving state, and retains the existing Supabase connection.

Deploy the ZIP to a staging Netlify site first. Open Account > My Profile, select a JPEG/PNG, press Save profile, and refresh. If saving fails, copy the exact message shown; this identifies the failing storage, auth or profile-sync operation. No SQL changes are included.

Note: Supabase live credentials and policies have not been independently tested. This is a diagnostic and reliability update, not a confirmed resolution of the underlying service-side issue.
