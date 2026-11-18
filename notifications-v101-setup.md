# The Local v101 — Administrator Email Notifications

## What is included

- Administrator control panel notification preferences and recent-alert history (only accounts passing `is_local_admin()`).
- Secure database queue and automatic **new member registration** trigger.
- Email sender Supabase Edge Function, using Resend on the server. Does not expose API credentials in the browser.
- Optional server-side `local_notify_queue()` function for reports, venues, marketplace, events, security and technical alerts. **These other event sources are NOT wired up automatically** and need calls from the corresponding trusted server handlers.
- Hourly/daily/weekly preferences defer individual messages until the selected interval; they are **not combined into one digest**. Daily/weekly summary generation is not implemented.

## Activate

1. Back up the existing website and database. Upload the v101 ZIP to a Netlify **test** deployment.
2. Run `NOTIFICATIONS-v101.sql` in Supabase SQL Editor. This depends on the existing `public.is_local_admin()` RPC from the admin setup. The migration only records new registrations **after installation**.
3. Set up a verified sending domain and a Resend account. Configure Edge Function secrets `RESEND_API_KEY`, `ALERT_FROM_EMAIL` (verified sender), `ADMIN_ALERT_EMAILS=michaelpetrice@gmail.com` (approved administrator recipient; add others later, comma-separated), and a long random `WORKER_TOKEN`. Supabase supplies `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` as server-side secrets. **Never put any of these in config.js or browser code.**
4. Deploy the `supabase/functions/admin-email-worker` Edge Function. Configure it for service-to-service calls and **disable gateway JWT verification only for this function**, because it independently requires `x-worker-token` (the random secret). Restrict access at the network gateway if possible.
5. Schedule an authenticated POST to the Edge Function every 1–5 minutes from a trusted scheduler (e.g. Supabase Cron with secrets stored in Vault). Header: `x-worker-token: <WORKER_TOKEN>`. Do not put the token in publicly visible SQL, Netlify frontend variables, or client code.
6. Sign in as an approved administrator, click the admin cog, and choose notification preferences. Create a **test account** to confirm the alert appears in Recent Alerts and the email arrives. Check delivery status and Resend logs.

## Security and privacy

Only verified admin recipients configured in server secrets receive emails. Registration alerts include the email and display name; review retention and UK GDPR requirements. Alerts are visible to authorised admins only. The registration trigger does not email from the database itself: it queues a message that the scheduled Edge Function delivers.

## Not yet completed

- No live Supabase/Resend credentials, deployments, scheduler or real delivery tests were available here.
- Report/venue/marketplace/security/technical event producers must be connected individually to `local_notify_queue` from **trusted backend code**.
- Daily and weekly aggregate reports are not implemented; selecting them currently does not generate summary emails.
- Recipients are configured in secure server secrets, not editable by administrators in the website.
