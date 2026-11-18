# The Local v135 — platform-wide administration and visual system

Based on v134. Updated the main app and all five standalone HTML screens with shared emerald-and-gold panel, button, form, table, dashboard and navigation styling. Added matching promotional artwork to the standalone screens. Added safe, decorative SVG replacement for common legacy emoji icons on buttons and links. The icon script does not modify application IDs, data or event listeners. All existing application code and permissions are retained.

## Staging checklist
- Check Venue Control Centre login, feature visibility, announcements, staff roles and audit trail.
- Check secure tables owner/moderator screens, invitations and reporting.
- Check competitions, for-venues and games room on desktop and mobile.
- Check all legacy icons; not every icon embedded in app-rendered images or CSS is replaced.
- Confirm banner artwork is not clipped and the left-hand admin cog still works.

No database migration required. Not browser-tested or Supabase-tested. Do not deploy to production before checking roles, authorisation and interactions.
