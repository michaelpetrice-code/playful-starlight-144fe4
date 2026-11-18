# The Local v177 — Venue image uploads

## Setup (required before uploading the ZIP to Netlify)
1. In the **existing The Local Supabase project**, open SQL Editor.
2. Back up the current definition of `public.local_builder_save` before modifying production.
3. Run `INSTALL-V177-VENUE-IMAGES.sql` once. It creates a public Storage bucket, an authenticated upload policy restricted to each user’s own folder, and extends `local_builder_save` to accept optional image URLs for feature cards.
4. Deploy the entire v177 ZIP to the **main The Local** Netlify project (not the Sales Engine).
5. Sign in as an eligible user. Open Venue App Builder, upload a logo and a photo on a feature card, save a draft, reload, publish, and check the public app.

## Features
- Upload JPG, PNG or WebP logo and individual feature-card photos (maximum 5 MB each).
- Each upload is stored under the signed-in user's UUID in `local-venue-media`.
- Uploads immediately update the preview; save draft or publish to persist the URL.
- Remove/replace images in the editor. Removed images are not deleted from Storage; perform periodic cleanup of unused media.
- Existing external HTTPS logo URLs and old cards continue working.

## Privacy and security
- This is a **public** image bucket: anyone who has a file URL can view that image. Do not upload private or sensitive images.
- The Storage insert policy permits authenticated users to upload only to their own folder; it does not by itself require a paid subscription. The Builder UI remains behind the existing subscription checks. Consider additional server-side entitlement enforcement and rate limiting before broad launch.
- Uploaded images are not scanned or moderated by this update. Review moderation and media retention before public rollout.
- No live database or website changes are made by generating this ZIP.
