# The Local v197 — Admin workspace and aggregated UK coverage

## Improvements
- Administration workspace: responsive navigation, clearer headings, owner-only analytics, dedicated shortcut to existing read-only AI maintenance copilot, and discreet admin cog as the entry point.
- Removed Administration and Analytics from the More/bottom navigation (the admin cog remains for verified admins).
- Owner-only UK aggregate map: member towns (only groups of 3+) and venue town counts, with an interactive layer switch and hover markers. The map uses approximate city reference points; locations outside its reference list appear in the table only.
- No individual names, addresses, postcodes, phone numbers, email addresses, GPS or precise coordinates are sent to the map component. Member directory remains separate and owner-only.

## Install
1. Back up current Netlify deployment.
2. Run INSTALL-V197-UK-COVERAGE.sql in Supabase SQL editor (requires existing v196 setup and local_is_owner()).
3. Upload the complete v197 ZIP to Netlify.
4. Sign in as platform owner, click the admin cog, open Analytics and Load UK coverage map.
5. Test with a normal member and a venue admin. Verify they cannot access owner-only data.

## Important
- The UK map is a schematic geographic view with approximate city positions, not an authoritative basemap or address locator.
- Venues without a stored town/city are not mapped.
- Existing AI copilot is reused; this upgrade does not introduce a new AI model or autonomous changes.
- Database row-level security and RPC owner checks are essential. UI hiding alone is not access control.
- JavaScript syntax and ZIP integrity were checked; live Supabase and browser tests were not performed.
