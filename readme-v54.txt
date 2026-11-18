The Local v54 - Owner Content Studio

1. Deploy this folder to your existing Netlify site.
2. In Supabase run OWNER-SETUP-v52.sql, OWNER-SETUP-v53.sql (if not already run), then OWNER-SETUP-v54.sql.
3. Authorise your own Supabase Authentication UUID in local_platform_owners as instructed in v52.
4. Sign in with the owner account and open Owner Dashboard > Content Studio.
5. Create an announcement, event or competition; optionally attach a poster and set publish date.
6. Published content appears on Home, Events and Local Updates when its publish date has passed.

Notes: Posters are in a PUBLIC storage bucket. Do not upload sensitive photos. Scheduling is based on the public feed query, not push notifications. No live Supabase deployment or end-to-end test has been performed. Member ban enforcement in legacy RLS remains a separate hardening task.
