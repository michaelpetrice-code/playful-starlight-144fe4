# The Local v18 — Push notifications for private chats

The app already includes OneSignal opt-in under **Alerts**. This update adds the private-chat message webhook handler and fixes initialization of the private chat screen. It does not automatically enable push when the ZIP is uploaded.

## 1. Configure OneSignal (if not already done)
Follow `PUSH-SETUP.md`. Create a Web Push app for https://tourmaline-chebakia-f1e2ac.netlify.app and set the public OneSignal App ID in `config.js`. NEVER put the REST API key or Supabase service-role key in browser files.

## 2. Deploy the new Supabase Edge Function
From the project root, using Supabase CLI, deploy `supabase/functions/private-chat-push/index.ts` as function `private-chat-push` with JWT verification disabled **for the database webhook endpoint only**. The function checks its own strong `x-private-chat-push-secret` header.

Set the following Edge Function secrets (Supabase Dashboard > Edge Functions > Secrets or CLI):
- `ONESIGNAL_APP_ID` — your OneSignal app ID
- `ONESIGNAL_REST_API_KEY` — secret OneSignal REST API key
- `PRIVATE_CHAT_PUSH_WEBHOOK_SECRET` — a new long, random secret unique to this webhook

Supabase-hosted Edge Functions normally expose `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as environment variables; verify these exist. Never put secrets in `config.js`.

## 3. Create database webhook
In Supabase Dashboard > Database > Webhooks, create:
- Name: `private_chat_push`
- Table: `public.private_chat_messages`
- Event: INSERT
- URL: `https://YOUR_PROJECT_REF.supabase.co/functions/v1/private-chat-push`
- Header: `x-private-chat-push-secret` set to exactly the function secret above

The webhook must send the normal Supabase payload with `type`, `table` and `record`. Do not set this webhook on the `posts` table: the existing `group-push` handler already covers general chats, events and challenges.

## 4. Publish the app
Upload the `lads-local-pwa` folder to Netlify. Each member should sign in, open **Alerts**, tap **Enable push notifications**, and grant browser permission. iPhone push requires an installed Home Screen app on iOS 16.4 or newer.

## 5. Test
Use two different registered accounts, both in the same private group, and enable notifications on both devices. Close the recipient app, send a private message from the other account, and check OneSignal delivery diagnostics and Supabase function logs. Only other current group members are targeted; the sender is excluded. The notification text is generic, never the private message body.

## Limitations
Delivery is not guaranteed: device/browser permission, battery restrictions, OneSignal subscription, and network conditions affect it. Push messages are not end-to-end encrypted; OneSignal processes device/subscription identifiers. Database Realtime must be enabled for `private_chat_messages` if you want live in-app updates without reopening the conversation. The realtime channel is optional for background push delivery.
