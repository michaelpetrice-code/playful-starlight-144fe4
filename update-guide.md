# The Lads' Local — Chat photos, event dates and leaderboard

## Deploy
1. Extract the ZIP.
2. Upload the **lads-local-pwa** folder (the folder containing index.html) to your existing Netlify project's Deploys page.
3. Wait for Published, then reopen the app and refresh. If installed on a phone, fully close and reopen it to get the new cached version.
4. Sign in and choose your group under Account.

## Changes
- Chat: attach an optional photo and send with or without text. Images are compressed and, for shared groups, uploaded to the existing private `pub-photos` bucket. Group members see the image in chat.
- Events: separate date and time controls replace the problematic combined date/time field. Date is required; omitted time defaults to 19:00.
- Leaderboard: weekly totals now include both game scores and the standard five-question pub quiz; scores update after submitting results and on returning to the leaderboard or refocusing the app. Hall of Fame uses the same score sources.
- Fetches up to 1,000 recent posts. Older results beyond that limit are not included in the leaderboard; pagination would be needed for larger groups.

## Test with two accounts
1. Send a photo in Chat on phone A and verify it appears on phone B.
2. Create an event with a date and time, then verify it appears on phone B.
3. Finish a game and open Leaderboard on both phones; check the weekly points.

No database migration is needed if the original `posts` and private `pub-photos` storage policies were installed successfully. Existing group and account data are not reset. If photo uploads fail, check Supabase Storage permissions. Background push still requires the separate PUSH-SETUP.md steps.
