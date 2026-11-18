# The Local v161 — Premium Messaging (Phase 1)

Deploy this ZIP to the existing Netlify site. It retains the original Supabase connection and existing v160 features.

## Added
- Event-driven Supabase Realtime updates for table messages and reactions, with existing polling fallback.
- Emoji picker, Enter-to-send (Shift+Enter for new lines), jump to latest.
- Copy-message action, recent message count and live connection status.
- Mobile-friendly emerald/gold chat styling.

## Already in v160
- Table invitations, replies, photo/video/PDF uploads, voice-note recording, likes, moderation and table events.

## Important
- Supabase Realtime postgres_changes requires the relevant tables to be enabled in the supabase_realtime publication. If not enabled, the existing 4.5-second polling still works.
- Database invitation functions must already be repaired; this release does not change database schema.
- This is NOT WhatsApp feature parity: voice/video calls, delivery/read receipts, end-to-end encryption, push alerts and offline messaging require separate implementation and testing.
- Do not deploy over live without staging validation. Test login, opening a table, sending messages, attachments, invitation acceptance and permissions with two accounts.
