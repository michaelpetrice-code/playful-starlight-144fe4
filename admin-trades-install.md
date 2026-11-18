# The Local — Marketplace Admin & Trades Directory

## Install (in this order)

1. Your existing Marketplace must already have been set up with `MARKETPLACE-SETUP.sql`. If not, run that first in your Supabase project's SQL Editor.
2. In Supabase SQL Editor, paste and run `ADMIN-TRADES-SETUP.sql`.
3. **Grant admin access securely** in Supabase SQL Editor using the SQL below, replacing the placeholder with the email you registered with in The Local:

```sql
insert into public.local_admins(user_id)
select id from auth.users where lower(email)=lower('YOUR_REGISTERED_EMAIL_HERE')
on conflict (user_id) do nothing;
```

4. To add up to five approved admins, run the same statement separately for each registered email. You must already have a registered account before you can grant it admin privileges.
5. Extract the ZIP and upload the **`lads-local-pwa` folder** to Netlify Deploys. Keep your existing `config.js` settings.
6. Once Netlify shows Published, close and reopen the app. Under **More**, open **Admin Dashboard** or **Trades & Services**.
7. Use two separate accounts to test: one regular member submits a trade listing; an admin approves it; a different member searches and sends an enquiry. Test reporting and hiding a Marketplace listing.

## What's included

- **Marketplace moderation:** view reports, hide/restore listings, mark reports reviewed.
- **Trades moderation:** approve/hide new service listings, view trade reports, mark reports reviewed, restore hidden adverts.
- **Trades directory:** search by trade/business/area, advertise services, optional public business phone and HTTPS website, private initial enquiry, report an advert.
- All registered members can see **approved** trades adverts. New trade listings require administrator approval.
- No in-app payment processing. Members arrange payment and work directly.

## Important limitations

- Admin review is **not professional verification**. The app does not independently check insurance, Gas Safe registration, electrical qualifications, DBS checks or trade credentials. Members must verify these independently before hiring.
- This is a directory and enquiry board, **not a booking or escrow platform**.
- Admin controls are protected by Supabase Row Level Security and the `local_admins` table, not by a password in browser code.
- Marketplace report reasons are visible to admins. Reporters' identities are not shown in the admin interface.
- Trade enquiries are private to the sender and recipient. This first version does not have a built-in reply thread for trades; members can arrange follow-up privately.
- The service directory does not yet support photo uploads or ratings. Do not claim endorsements or verified reviews.
- Run the SQL and test on real phones before public launch. Syntax tests do not prove live Supabase configuration.

## Existing data

The new SQL does not drop or overwrite existing Marketplace listings, chat, events, tournaments or users. The existing Netlify site URL stays the same.
