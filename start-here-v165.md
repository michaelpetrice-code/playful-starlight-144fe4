# v165 Profile save status repair

This build makes profile saving status persistent across re-renders (10 minutes), displays each save stage in the profile form, and prevents a disappearing toast from hiding errors. It does not claim to repair unknown Supabase policy failures.

Deploy to Netlify staging, open Account > My Profile, choose a photo, press Save profile, and read the persistent status. If it fails, report the full error. No SQL changes.
