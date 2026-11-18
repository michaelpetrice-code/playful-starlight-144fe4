-- The Local v203: Coombe complimentary app-builder pilot.
-- Run only in The Local's existing Supabase SQL editor, after v147/v149/v173.
-- Change the email below to the VERIFIED Coombe account that will own/manage the builder app.
-- This grants free entitlement; it does NOT create a Stripe payment or falsely mark an invoice paid.
-- IMPORTANT: The app starts as a DRAFT. Publish from the builder after visual/functional review.
begin;
create table if not exists public.local_builder_complimentary_licenses (
 user_id uuid primary key references auth.users(id) on delete cascade,
 organisation text not null,
 reason text not null,
 granted_at timestamptz not null default now(),
 revoked_at timestamptz
);
alter table public.local_builder_complimentary_licenses enable row level security;
revoke all on public.local_builder_complimentary_licenses from public,anon,authenticated;

-- v149's account check includes both paid Stripe subscriptions and complimentary licences.
create or replace function public.local_builder_account_active(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.local_builder_subscribers s where s.user_id=p_user and s.active_until>now())
 or exists(select 1 from public.local_billing_subscriptions s where s.user_id=p_user and s.active_until>now())
 or exists(select 1 from public.local_builder_complimentary_licenses c where c.user_id=p_user and c.revoked_at is null)
$$;
create or replace function public.local_builder_has_access()
returns boolean language sql stable security definer set search_path='' as $$
 select public.local_builder_account_active(auth.uid())
$$;
revoke all on function public.local_builder_account_active(uuid),public.local_builder_has_access() from public,anon,authenticated;
-- These are invoked inside existing SECURITY DEFINER functions; authenticated clients cannot pass arbitrary user IDs.

-- Enable a complimentary account and prepare a draft only after replacing the placeholder.
do $$
declare owner_uuid uuid; account_email text := 'REPLACE_WITH_COOMBE_ADMIN_EMAIL';
begin
 if account_email = 'REPLACE_WITH_COOMBE_ADMIN_EMAIL' then
  raise exception 'Replace REPLACE_WITH_COOMBE_ADMIN_EMAIL with the real Coombe admin login email before running.';
 end if;
 select id into owner_uuid from auth.users where lower(email)=lower(account_email);
 if owner_uuid is null then raise exception 'No Supabase Auth account found for %. Ask the administrator to register first.',account_email; end if;
 insert into public.local_builder_complimentary_licenses(user_id,organisation,reason)
 values(owner_uuid,'Coombe Social Club','Complimentary ongoing founding venue licence')
 on conflict(user_id) do update set organisation=excluded.organisation,reason=excluded.reason,revoked_at=null;
 -- Never overwrite an existing owner's app or another owner's reserved slug.
 if exists(select 1 from public.local_builder_apps where owner_id=owner_uuid) then
  raise notice 'Account already has an app: existing draft left unchanged.';
 elsif exists(select 1 from public.local_builder_apps where slug='coombe-social-club') then
  raise exception 'Slug coombe-social-club already belongs to another account. Resolve ownership before proceeding.';
 else
  insert into public.local_builder_apps(owner_id,slug,draft,published,revision)
  values(owner_uuid,'coombe-social-club','{"name": "Coombe Social Club", "type": "Social club", "town": "Coventry", "welcome": "Welcome to Coombe Social Club. Find club events, room hire, competitions, rewards and our community in one place.", "theme": "emerald", "logo": "https://thelocal.me.uk/assets/coombe/venue-banner.jpg", "features": {"events": [{"title": "What’s On at Coombe", "detail": "See the latest club events and entertainment in the existing Coombe Social Club app.", "url": "https://stellar-mandazi-6aa7db.netlify.app/"}], "tickets": [{"title": "Club events and tickets", "detail": "Open the existing club app to view ticket availability and announcements.", "url": "https://stellar-mandazi-6aa7db.netlify.app/"}], "room": [{"title": "Concert Room", "detail": "Ask the club about concert room availability and bookings.", "url": "https://stellar-mandazi-6aa7db.netlify.app/"}, {"title": "Lounge", "detail": "Ask the club about lounge availability and bookings.", "url": "https://stellar-mandazi-6aa7db.netlify.app/"}], "bingo": [{"title": "Kids’ Bingo", "detail": "Check the club app for upcoming bingo sessions and details.", "url": "https://stellar-mandazi-6aa7db.netlify.app/"}], "draw": [{"title": "Chase the Lady", "detail": "Check the club app for current prize and draw information.", "url": "https://stellar-mandazi-6aa7db.netlify.app/"}], "rewards": [{"title": "Coombe Rewards", "detail": "Members can check the existing club app for reward information.", "url": "https://stellar-mandazi-6aa7db.netlify.app/"}], "gallery": [{"title": "Club Photos", "detail": "See the concert room and lounge on the Coombe venue profile.", "url": "https://thelocal.me.uk/"}], "games": [{"title": "The Local Games Room", "detail": "Enjoy the games room from The Local.", "url": "https://thelocal.me.uk/games-room-next.html"}], "contact": [{"title": "Coombe Social Club", "detail": "Visit the club website for contact details and opening information.", "url": "https://www.coombesocialclub.co.uk/"}]}}'::jsonb,null,1);
 end if;
end $$;
commit;
-- Once published in the builder, optionally link the existing approved directory row:
-- update public.local_venue_directory set builder_app_slug='coombe-social-club'
-- where lower(btrim(name))='coombe social club' and lower(btrim(town))='coventry';
-- Do not update the directory until the new app has been reviewed.
