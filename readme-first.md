# The Lads' Local — Phone App Upgrade

1. Extract this ZIP.
2. Upload the `lads-local-pwa` folder (the folder containing index.html) to your EXISTING Netlify project's Deploys page: https://app.netlify.com/projects/tourmaline-chebakia-f1e2ac/deploys
3. Open https://tourmaline-chebakia-f1e2ac.netlify.app/ and force refresh if necessary.
4. Use the new **Install** tab for Android and iPhone instructions. The icon and standalone app setup are included.
5. **To activate push notifications**, follow `PUSH-SETUP.md`. It requires OneSignal and a Supabase Edge Function; it is not automatically enabled by uploading the ZIP.
6. The existing Supabase URL and publishable key are retained in config.js. No SQL migration is required for this upgrade.

If the site shows old files, clear the old service worker/browser cache or open in a private tab to check the latest deployment.
