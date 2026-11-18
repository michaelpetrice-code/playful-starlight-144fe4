# The Local v126 — Compact Homepage Feature Slideshow

Adds an eight-slide, responsive homepage feature showcase above the existing hero. Features: Virtual Pub Tables (integrated secure v122 route), Who’s Up for It?, Games Room (Arcade), Venue Hub, Marketplace, Trades, Club Competitions and Rounds. Manual previous/next, pause/play, 6.5-second advance, keyboard-focus pause, reduced-motion respect. All navigation uses the current app data-go routes; no separate legacy chat or older Games Room links introduced.

**Important:** This update does not delete older code modules or migrate legacy Supabase data. Existing v125 modules and v123 secure table migrations remain unchanged. Before removing old engines or database tables, conduct a dependency audit and migrate backed-up records.

Deploy to Netlify staging; test all eight slides and navigation on desktop/mobile. No SQL changes.
