THE LOCAL v22 — NAVIGATION LAYOUT FIX

ROOT CAUSE: Generic nav styling sets top:0; the bottom navigation used position:fixed and bottom:0 but did not reset top. This stretched the navigation surface from top to bottom, obscuring the main content and blocking clicks.

FIXES:
- Explicit top:auto and height:auto on the bottom navigation.
- Keep the navigation bar at the bottom and the More drawer above it.
- Stop generic tab click binding from overwriting the dedicated bottom-navigation and More-menu click handlers.
- Refresh stylesheet and app cache versions.

Deploy the whole lads-local-pwa folder to your existing Netlify site. No new SQL. Test Home, Chat, Events, Private Chats, More, and Account on desktop and phone. Live Supabase flows are not verified by static checks.
