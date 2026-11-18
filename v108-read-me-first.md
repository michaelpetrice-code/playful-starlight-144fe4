# The Local v108 — Unified Emerald & Gold

This is a visual redesign of the existing v107 staging app, NOT a rewrite of its JavaScript or database.

## Updated
- Member home, cards, buttons, forms and bottom navigation
- Games and chat shared panels/cards and controls
- Registration/sign-in and modal styles
- Venue Control Centre layout, controls and typography
- All other standalone HTML pages share the same base theme
- Existing `for-venues.html` showcase retained from v107

## Deploy
1. Back up your current Netlify deployment.
2. Extract the ZIP, drag the whole extracted folder into the Netlify staging deployment area.
3. Hard-refresh (Ctrl+F5) and test home, games, chat, sign-in, admin and phone layout.
4. Do not deploy to production until tests pass.

## Important limits
- This applies a coherent visual theme, not a pixel-perfect reproduction of the reference illustration.
- Individual game canvases and complex layouts may still need component-specific styling.
- No Supabase schema or auth/permission changes; the existing admin-cog visibility limitations remain.
- No claims of tested live functionality; this is a staging design update.
