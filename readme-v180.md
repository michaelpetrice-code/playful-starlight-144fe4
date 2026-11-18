# The Local v180 — Guided Builder, live themes and notification preferences

Deploy to the main The Local Netlify project, after backing up the current deployment. Run `INSTALL-V180-NOTIFICATION-PREFERENCES.sql` in the correct Supabase project before testing notification preferences. This migration does **not** send push notifications.

New: a contextual, user-approved assistant that can apply theme, enable features and draft a welcome message without technical prompts. The existing optional AI Edge Function still handles broader AI suggestions; this contextual assistant is a deterministic local helper, not a generative chatbot. Live preview refreshes on each edit and uses theme-specific colours for the full preview. A notification preferences panel stores venue-owner choices with RLS restricted to their own user account.

**Not yet implemented:** actual member notification opt-in, secure push token storage, delivery workers, scheduled sends, automatic detection of new/changed events, retries or audit logs. Do not advertise alerts as live until those components are built and tested. A user must consent to receiving notifications and be able to opt out. Avoid automatically sending notifications on every draft edit.

Test with a signed-in authorised Builder account: switch themes, verify preview, use assistant suggestions and apply, save/reload, save notification preferences and reload, ensure a second user cannot see another owner’s preferences, and verify published app separately.
