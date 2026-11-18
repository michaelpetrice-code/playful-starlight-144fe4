THE LOCAL v19 — BLANK WHITE OVERLAY FIX

The OneSignal push SDK was loading on every page visit even when no push App ID was configured. This build no longer loads the OneSignal SDK at page startup. It loads only after a signed-in user chooses to enable notifications. Existing private chat, marketplace, trades, and other features are retained.

It also protects startup against malformed local demo data.

DEPLOY: Extract ZIP; upload lads-local-pwa folder to the existing Netlify site. Wait for Published. Then open the site in a new Incognito tab first.

IMPORTANT: The screenshot alone does not prove which script generated the white overlay. If it persists in Incognito after this update, inspect Chrome DevTools > Elements to identify the overlay's element and report its class/id. Also test whether browser extensions cause the issue.

Push notifications still require valid OneSignal and Supabase configuration; no notifications are activated automatically.
