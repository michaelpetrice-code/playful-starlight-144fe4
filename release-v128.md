# The Local v128 — Slideshow Fit & Unified Administration

- Corrected slideshow dimensions to the artwork’s original 1200 × 450 ratio, removing forced desktop stretching and cropping.
- Reduced the slideshow controls and placed the Explore link in a small corner overlay.
- Removed the duplicate right-hand admin cog from view.
- Left cog now opens one administration menu linking to the existing Venue Control Centre and, only when the legacy admin permission check succeeds, Content & email notifications.
- Existing admin functionality and Supabase permissions are unchanged; this is a unified access point, not a backend merge of all administration modules.
- No database changes. Test in Netlify staging with admin and normal member accounts.
