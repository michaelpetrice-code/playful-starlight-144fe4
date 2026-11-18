# The Local v159 — restore original account connection

This release restores the original Supabase project `huuqwjmztqurnyyokrxd` and its supplied publishable key. It is based on v157, retaining the Create a Table UI changes. It does not migrate users or tables.

## Required database step
Open Supabase project `huuqwjmztqurnyyokrxd` (NOT The Local – Staging), open SQL Editor, inspect and run `INSTALL-V156-TABLES-REPAIR.sql` once. This changes the live database: take a backup and review the script before running it. If SQL reports an error, stop and investigate.

## Deploy
Upload this ZIP to your existing Netlify site. Refresh/sign in, then test Virtual Pub Tables > Create a Table > Coombe Social Club.

## Verification
This package has been checked for ZIP integrity and correct config values. Live sign-in and table creation have not been tested.
