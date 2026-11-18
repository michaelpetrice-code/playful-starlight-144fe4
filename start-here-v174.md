# The Local v174 Analytics

1. Open the Supabase project used by the live site. In **SQL Editor → New query**, paste and run the whole **INSTALL-V174-ANALYTICS.sql** file from this ZIP. It uses the existing venue directory, live Stripe billing and platform permission functions.
2. Upload the contents of this ZIP to the existing Netlify site. Keep `index.html` at the root.
3. Sign in to The Local with a platform owner or platform administrator account. Open the **admin cog → Analytics**. Use a private browser tab to allow analytics, visit a page, and reopen the report with **Refresh**.

Traffic collection starts after the SQL and website update. To verify a campaign, create a tagged link in **Build a campaign link**, open it in a private tab, allow analytics, and refresh the admin report. The generated campaign links use the live domain.

## How counts work

- Visits use a temporary browser-tab ID and time out after 30 minutes of inactivity. Page views and venue clicks count once per visit, page or venue, per UK day. Multiple tabs or devices can register separate visits.
- Only browsers that grant optional analytics send traffic data. The site sends device category, known channel or campaign name, the page/event category and the public venue ID when applicable. It does not store IP addresses, positions, full URLs, search text, account IDs or private table content in the traffic events table.
- Venue locations show the town of the venue browsed. App clicks measure links opened from the profile and install interest measures the installation instructions opened. Traffic with no visible referral source or tag appears under Direct / unknown.
- The dashboard reads total new accounts in the existing Supabase project and totals of saved tables, posts, comments, events, invites and venue applications. These totals can include activity from before installing analytics.
- Completed trial starts use live Stripe subscription events from installation onwards. Current trial and paid counts are live subscription snapshots. Checkout visits are browser activity, so the campaign view cannot attribute completed Stripe trials to individual campaigns.

The report offers the last 7, 30 or 90 days. To remove older traffic event rows, run this in the SQL Editor as a project administrator.

```sql
delete from public.local_analytics_events
where event_day < (now() at time zone 'Europe/London')::date - 89;
```
