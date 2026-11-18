# The Local v147 Venue App Builder

This staging ZIP extends **The Local v146 Venue Applications**. An eligible owner can open **More → Venue App Builder**, start with the social-club template or request AI suggestions, edit content, save a draft and publish one branded venue web app. Members open a shareable link such as `venue-app.html?venue=example-club`. A published page remains stable when the owner saves a private draft. Publishing and unpublishing are explicit actions. The builder currently supports one venue per subscriber account and locks the public link name after the first save.

## Get it running on staging

1. Extract the ZIP. In `config.js`, use your **staging** Supabase URL and public key so the preview uses the staging project. Keep your existing v146 application setup if you use it. Upload the contents to your Netlify staging site. Follow your existing staging site's access settings. Keep the existing production deploy available.
2. Run `INSTALL-V147-VENUE-APP-BUILDER.sql` in that staging Supabase project's SQL Editor. Create or identify a staging user through The Local's sign-in. Copy that user's ID from Supabase Authentication → Users.
3. Grant that user builder access with the example below. Set the expiry to the end of the user's verified subscription or staging trial.

   ```sql
   insert into public.local_builder_subscribers(user_id, active_until)
   values ('REPLACE_WITH_THE_USERS_UUID', now() + interval '30 days')
   on conflict (user_id) do update set active_until = excluded.active_until;
   ```

4. For the AI assistant, deploy `supabase/functions/venue-builder-ai` to the same staging project. Set the `OPENAI_API_KEY` in **Supabase Edge Function Secrets**. The default model is `gpt-5-mini`. Set `OPENAI_VENUE_BUILDER_MODEL` only if you want to use another model that supports structured output. The assistant verifies the signed-in user and subscriber access, limits requests per subscriber and submits only the entered brief and basic venue details. The template and manual editor work without an AI key.
5. Sign in to staging and open **More → Venue App Builder**, or use **Create Your Venue** on the staging For Venues page. Save a draft, open the builder again to verify persistence, then publish. Open the public link in a private window and check mobile layout. Use a second signed-in account to send a Room Hire or Contact enquiry and check it appears in the owner's inbox. Verify that a second subscriber has a separate draft, inbox and public link.

## Generated app features

- **What’s On**, **Events & Tickets**, **Room Hire**, **Kids’ Bingo**, **Chase the Lady**, **Member Rewards**, **Gallery**, **Games Room** and **Contact the Venue**.
- Owners choose which sections appear, edit cards, add links to existing services, set their logo via HTTPS and choose a colour theme. The preview uses the same page renderer as published apps.
- Room hire and contact have enquiry forms for signed-in members. Enquiries appear in the venue owner's builder inbox. Kids’ Bingo has a browser-based markable ticket with line and full-house prompts. Games Room links to The Local’s existing games.
- Tickets can link to a venue's existing ticket provider. Rewards and the club draw are informational cards. The generated apps do not run a checkout, award stamps, sell draw entries, send enquiry emails, or operate door entry. The games link opens the shared Games Room.

## Subscriber access and billing

The audit found that the live plan buttons lead to a demo and the connected Stripe account is in test mode. The builder uses server-side subscription entitlements. A platform operator can grant or renew access after verifying subscription status. Expiry stops editing, publishing, public display and new enquiries until renewed. Ordinary members cannot grant themselves access.

Automatic access from Stripe payments requires the live subscription checkout and verified webhook integration from the launch checklist. This package does not change Stripe or activate live payments.

## Test scope

Local JavaScript checks used a simulated DOM, Supabase API and AI response. They exercised the subscriber gate, AI review and apply, draft reload, publish and unpublish, protection of the published snapshot, bingo marking, inbox rendering and the Edge Function’s auth and quota checks. Browser launch was blocked in the build environment. Run the staging tests above in a browser against your Supabase project and OpenAI account to verify the deployed UI, database permissions and email sign-in.
