# Member message push

`member-push` uses Web Push with the site's root service worker. Members must allow notifications and register a device. No OneSignal account or REST key is required.

The endpoint validates the current Supabase user for registration, device removal, table mute preferences and self-tests. The queue dispatcher uses an independent random webhook secret, not browser authentication. `verify_jwt=false` is required because these routes perform their own authentication. Only the public VAPID key is returned by the public-key route.

VAPID keys and the dispatcher secret are in Vault under `local_push_vapid_public`, `local_push_vapid_private` and `local_push_webhook_secret`. Only the restricted service-role configuration function reads these named secrets. Never commit their values. The deployed function needs only Supabase's built-in server URL and service-role environment variables.

New table, private-chat, marketplace and member-notice inserts create durable jobs. A protected asynchronous request starts delivery immediately; a one-minute cron retries pending jobs. Delivery checks current approved table membership, excludes senders, applies mutes and uses generic text rather than message content. Successful device deliveries are recorded to avoid duplicate retries, and 404/410 subscriptions are removed. Failures back off and stop after five attempts. Stable notification tags coalesce duplicate provider receipts; exactly-once receipt cannot be guaranteed across network crashes.

Source schema: `install-native-push-v241.sql`. Realtime publication: `install-realtime-messages-v241.sql`; this asserts existing RLS and SELECT policies, without changing message grants or membership rules. Cron runs `select local_push_private.wake()` once a minute as `the-local-message-push`.

Deploy `index.ts`, `core.mjs`, and `deno.json` with `entrypoint_path=index.ts` and `import_map_path=deno.json`. Exact dependency versions and an npm lockfile are included for local verification.

Validation covers membership, mute rules, endpoint allowlists, subscription persistence, opt-out, authentication rejection, encryption, queue dispatch and recipient RLS. A real phone still needs to grant permission and use **Send a test notification**; a saved subscription or provider acceptance is not proof that a handset displayed the notification.
