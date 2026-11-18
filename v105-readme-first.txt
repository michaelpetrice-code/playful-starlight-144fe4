THE LOCAL v105 — VENUE OWNER SHOWCASE + VISUAL POLISH

WHAT IS NEW
- for-venues.html: modern public-facing venue-owner landing page
- Live venue branding preview (name + colour), browser-only; no writes
- Clearly marked proposed subscription packages and feature roadmap
- New For venues link on main app header and auth screen
- Keyboard-focus and reduced-motion polish

PRESERVED
- Existing The Local app, chat, games, Supabase configuration, admin cog and venue-control.html

DEPLOY
1. Keep your live app unchanged.
2. Upload this extracted folder to a SEPARATE Netlify staging site.
3. Visit /for-venues.html and test mobile/desktop preview.
4. Verify /index.html and /venue-control.html still work with your staging configuration.

NOT YET IMPLEMENTED
- Self-service venue creation, payments, automated branded app provisioning, shared Coombe auth, secure QR access.
- The showcase does NOT claim these are live.

SECURITY
- Existing v104 admin cog may still be visible to ordinary users. It is NOT an access-control mechanism; the dashboard must enforce server-side venue roles.
- Do not put Supabase secret/service_role keys in browser files.
