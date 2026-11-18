THE LOCAL v20 — STARTUP RECOVERY

Chrome reported: extra-games.js:38 Uncaught SyntaxError: Unexpected token }.
This update supplies a fresh, renamed games module and isolates the optional games import so an error in that module cannot prevent the entire app from loading. It also changes the service-worker cache version to v20.

1. Extract this ZIP.
2. Upload the lads-local-pwa folder to your existing Netlify Deploys page.
3. Wait for Published and open the site in a NEW Incognito window.
4. If the blank overlay remains, open Chrome DevTools > Elements and click the white panel using the element selector. Send the highlighted element and Console screenshot.

This does not change Supabase tables, user accounts, chats or Marketplace data. Background push still requires the OneSignal and Supabase configuration.
