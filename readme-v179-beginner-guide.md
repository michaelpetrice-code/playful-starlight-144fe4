# The Local v179 — Beginner-friendly App Builder guide

Deploy the complete ZIP to the **main The Local Netlify project** (not the Sales Engine). No new SQL or environment variables are required for this update.

The guide appears above the existing Venue App Builder editor for eligible users and walks them through five steps: venue details, branding, choosing features, editing cards, and saving/publishing. “Show me where” scrolls to the relevant field; “Help me write my app” pre-fills the existing AI brief and requires a separate explicit click before sending it. The guide can be hidden and reopened.

The existing Supabase Edge Function `venue-builder-ai` must already be configured for AI suggestions to work; otherwise manual editing and the guide still work. The guide does not save, publish, or upload anything on its own.

Test on a signed-in eligible account, including mobile layout, AI suggestion, save draft, and published preview. Keep a backup of the previous deployed ZIP.
