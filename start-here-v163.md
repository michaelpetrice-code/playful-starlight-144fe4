# The Local v163 — Communications & Privacy Foundation

Built on v162, retaining original Supabase connection and existing tables.

## Implemented
- Per-table mute setting saved locally on each device.
- Opt-in browser notifications for new messages while the page is in the background, when the browser grants permission.
- Unread counter in the browser tab title, cleared on return.
- Hide my online presence setting (stops broadcasting presence for that table).
- Notification content deliberately avoids revealing message text.

## Not included yet
- Voice/video calls: require a secure signalling service, TURN/STUN configuration, moderation and device testing.
- Background push while the app is fully closed: requires service worker and server-side Web Push.
- End-to-end encryption and cross-device read receipts.

## Test before production
Use two approved accounts on a staging deployment. Test mute, notification permissions, hidden-tab unread count, presence toggle and messages. Confirm that the invitation SQL repair is installed. Do not assume browser notification delivery on every mobile browser.
