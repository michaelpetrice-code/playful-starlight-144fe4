THE LOCAL — QUALITY REVIEW (v15)

CHECKED
- JavaScript syntax: all local JS modules.
- Static dependencies: HTML script/style files, PWA cache paths and icon assets.
- Modern responsive styling: mobile bottom navigation, responsive cards, touch targets, visible keyboard focus and reduced-motion support.
- Theme engine: six palettes, light/dark/system, local persistence and dark-mode surface overrides.
- Feature integration: Marketplace, Trades, Admin, Community, Events, Chat, Photos, Games, Tournaments, Account and Alerts modules are included.

NOT VERIFIED
- Supabase database permissions, SQL setup and cloud uploads on your own project.
- Real account-to-account messaging, admin access and push notifications.
- Every workflow on physical Android and iPhone devices.

BEFORE GOING LIVE
1. Keep your existing config.js (publishable key only; never a secret/service-role key).
2. Confirm Marketplace and Admin/Trades SQL migrations were run in Supabase.
3. Test with two separate member accounts, plus one approved admin.
4. Check marketplace photos, enquiries, reports, trade approval, chat, event RSVPs and game scores.
5. Test all six palettes in light and dark mode, then install on a phone.
6. If an old design persists, refresh the installed app after deploying.

Deploy by uploading the extracted lads-local-pwa folder to Netlify.
