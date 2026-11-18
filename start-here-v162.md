# The Local v162 — Virtual Pub Experience

Builds on v161, retains the original Supabase connection and existing tables.

## New
- Immersive pub-table seating scene with up to 12 member avatars and overflow count.
- Live online presence through Supabase Realtime Presence (ephemeral, only tracked after membership approval).
- One-tap Invite a friend action, wired to existing sharing workflow.
- Member and online counts, responsive layout, reduced-motion-aware effects.

## Limits / verification
- Presence depends on Supabase Realtime connectivity and may fall back to offline labels.
- Presence is not an identity verification or delivery receipt.
- Existing invitation SQL fix and member permissions are still required.
- No new database schema required.
- Test in staging with two accounts before deploying live.
- This does not add WhatsApp-grade calling, encryption, or push notifications.
