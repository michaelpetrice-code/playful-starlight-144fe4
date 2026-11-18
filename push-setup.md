# The Lads' Local — Install & Push Notifications

## What works immediately

The ZIP includes PNG icons, web manifest, standalone display settings, an Install tab and a PWA service worker. You can install the website on Android (Chrome menu > Install app) and iPhone (Safari > Share > Add to Home Screen). iPhone web push requires iOS 16.4 or later and the Home Screen app.

**Push notifications require the additional steps below.** They do not automatically start just by uploading the ZIP. In-app alerts already work when the app is open.

## A. Enable web push with OneSignal

1. Create a OneSignal account at https://onesignal.com and add a **Web Push** app. Check current pricing/limits.
2. Set the exact website origin: `https://tourmaline-chebakia-f1e2ac.netlify.app` (no trailing path). Use the custom-code / typical site setup.
3. In OneSignal's advanced web push configuration, set the service worker file path to `OneSignalSDKWorker.js` and its scope to `/onesignal/` if requested. The file is at the root of this deployment.
4. Copy the **OneSignal App ID** (not the REST API key). In `config.js`, set `window.LADS_CONFIG.oneSignalAppId = "YOUR_APP_ID";`.
5. Deploy the folder again to Netlify. Sign in on the phone, open **Alerts**, press **Enable push notifications** and accept permission. Each mate must do this on their own phone.
6. Test a notification manually from the OneSignal dashboard to confirm that subscriptions work before setting up automated messages.

Do not put the OneSignal REST API key in config.js, app.js, or any other browser file.

## B. Automatically send pushes for chat, events and challenges

The package includes a Supabase Edge Function in `supabase/functions/group-push/index.ts`. It receives an INSERT webhook from the `public.posts` table, looks up group members, excludes the sender, and sends generic notifications to OneSignal subscribers. Only members who have opted in can receive pushes. It does not send chat content to OneSignal.

1. Install the Supabase CLI and sign in; link your existing Supabase project.
2. In Supabase Edge Functions, deploy `group-push` with **JWT verification disabled for this webhook endpoint**. The function independently checks a strong shared secret in the `x-group-push-secret` header. Keep that secret private.
3. Set Edge Function secrets `ONESIGNAL_APP_ID`, `ONESIGNAL_REST_API_KEY`, `GROUP_PUSH_WEBHOOK_SECRET`. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are supplied to Supabase-hosted functions; verify they exist. Never place any of these secrets in browser files.
4. In Supabase Dashboard > Database > Webhooks, create a webhook for table `public.posts`, event **INSERT**. Use the function URL `https://YOUR_PROJECT_REF.supabase.co/functions/v1/group-push` and header `x-group-push-secret` matching your function secret. Ensure it sends the normal Supabase webhook JSON body (including `type`, `table`, and `record`).
5. Test with two separate users who belong to the same group, on two phones. Opt in on both devices, then send a chat message. The recipient should receive a push when the app is closed if the platform allows it.
6. Inspect Supabase function logs and OneSignal delivery diagnostics if a push does not arrive.

### Security and operational notes

- Do not use the public service-role key in client files. Database access is server-side in the Edge Function only.
- Protect the webhook secret. Rotate it if exposed. Supabase RLS remains enabled for browser users.
- The function handles only chat, event and challenge posts; no other activities trigger push.
- The sender is excluded. Delivery depends on browser permissions, device settings, subscription state and OneSignal.
- OneSignal stores subscription/device identifiers and processes notifications; review its privacy terms and disclose this to the group.
- For a custom domain later, update the OneSignal origin and function notification URL; web push subscriptions generally need to be re-established.
- Do not overwrite or re-run the database schema just to enable push. The existing schema is sufficient for this webhook.
