-- THE LOCAL: Admin moderation and Trades directory
-- Run after MARKETPLACE-SETUP.sql. Run as project owner in Supabase SQL Editor.
create table if not exists public.local_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
alter table public.local_admins enable row level security;
drop policy if exists local_admin_self_read on public.local_admins;
create policy local_admin_self_read on public.local_admins for select to authenticated using(user_id=auth.uid());
-- Never add a client INSERT/UPDATE/DELETE policy for local_admins.
create or replace function public.is_local_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.local_admins where user_id=(select auth.uid()));
$$;
revoke all on function public.is_local_admin() from public;
grant execute on function public.is_local_admin() to authenticated;

-- Marketplace moderation: hide a listing without destroying messages or reports.
alter table public.market_listings drop constraint if exists market_listings_status_check;
alter table public.market_listings add constraint market_listings_status_check check(status in ('available','sold','hidden'));
drop policy if exists market_read on public.market_listings;
create policy market_read on public.market_listings for select to authenticated
 using(status <> 'hidden' or seller_id=auth.uid() or public.is_local_admin());
drop policy if exists market_edit on public.market_listings;
create policy market_edit on public.market_listings for update to authenticated
 using(seller_id=auth.uid() or public.is_local_admin())
 with check(seller_id=auth.uid() or public.is_local_admin());
drop policy if exists market_delete on public.market_listings;
create policy market_delete on public.market_listings for delete to authenticated
 using(seller_id=auth.uid() or public.is_local_admin());
drop policy if exists market_reports_admin_read on public.market_reports;
create policy market_reports_admin_read on public.market_reports for select to authenticated using(public.is_local_admin());
drop policy if exists market_reports_admin_update on public.market_reports;
create policy market_reports_admin_update on public.market_reports for update to authenticated
 using(public.is_local_admin()) with check(public.is_local_admin());

create table if not exists public.local_trades (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 business_name text not null check(length(trim(business_name)) between 2 and 120),
 trade text not null check(length(trim(trade)) between 2 and 80),
 area text not null check(length(trim(area)) between 2 and 100),
 description text not null check(length(trim(description)) between 10 and 2000),
 phone text not null default '' check(length(phone)<=40),
 website text not null default '' check(length(website)<=300),
 photo_paths text[] not null default '{}',
 status text not null default 'pending' check(status in ('pending','approved','hidden')),
 created_at timestamptz not null default now()
);
create index if not exists local_trades_search on public.local_trades(trade,area,status);
alter table public.local_trades enable row level security;
drop policy if exists trades_read on public.local_trades;
create policy trades_read on public.local_trades for select to authenticated
 using(status='approved' or owner_id=auth.uid() or public.is_local_admin());
drop policy if exists trades_create on public.local_trades;
create policy trades_create on public.local_trades for insert to authenticated
 with check(owner_id=auth.uid() and status='pending');
-- Owners can edit their details, but every edit requires fresh approval.
-- The update is handled by a server-side trigger; owners cannot set approval directly.
create or replace function public.trades_enforce_owner_review() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if not public.is_local_admin() then
   if new.owner_id <> old.owner_id then raise exception 'Cannot transfer listing'; end if;
   new.status := 'pending';
 end if;
 return new;
end;$$;
drop trigger if exists trades_owner_review on public.local_trades;
create trigger trades_owner_review before update on public.local_trades
 for each row execute function public.trades_enforce_owner_review();
drop policy if exists trades_edit on public.local_trades;
create policy trades_edit on public.local_trades for update to authenticated
 using(owner_id=auth.uid() or public.is_local_admin())
 with check(owner_id=auth.uid() or public.is_local_admin());
drop policy if exists trades_delete on public.local_trades;
create policy trades_delete on public.local_trades for delete to authenticated
 using(owner_id=auth.uid() or public.is_local_admin());

create table if not exists public.local_trade_enquiries (
 id uuid primary key default gen_random_uuid(),
 trade_id uuid not null references public.local_trades(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 message text not null check(length(trim(message)) between 1 and 1500),
 created_at timestamptz not null default now(),
 check(sender_id <> recipient_id)
);
alter table public.local_trade_enquiries enable row level security;
drop policy if exists trade_enquiry_read on public.local_trade_enquiries;
create policy trade_enquiry_read on public.local_trade_enquiries for select to authenticated
 using(sender_id=auth.uid() or recipient_id=auth.uid());
drop policy if exists trade_enquiry_send on public.local_trade_enquiries;
create policy trade_enquiry_send on public.local_trade_enquiries for insert to authenticated
 with check(sender_id=auth.uid() and exists (
  select 1 from public.local_trades t where t.id=trade_id and t.owner_id=recipient_id and t.status='approved'
 ));

create table if not exists public.local_trade_reports (
 id uuid primary key default gen_random_uuid(),
 trade_id uuid not null references public.local_trades(id) on delete cascade,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(length(trim(reason)) between 1 and 1000),
 reviewed boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.local_trade_reports enable row level security;
drop policy if exists trade_report_create on public.local_trade_reports;
create policy trade_report_create on public.local_trade_reports for insert to authenticated with check(reporter_id=auth.uid());
drop policy if exists trade_report_admin_read on public.local_trade_reports;
create policy trade_report_admin_read on public.local_trade_reports for select to authenticated using(public.is_local_admin());
drop policy if exists trade_report_admin_update on public.local_trade_reports;
create policy trade_report_admin_update on public.local_trade_reports for update to authenticated
 using(public.is_local_admin()) with check(public.is_local_admin());

-- ADMIN SETUP (run separately, replacing the address):
-- insert into public.local_admins(user_id)
-- select id from auth.users where email='YOUR_REGISTERED_EMAIL_HERE'
-- on conflict (user_id) do nothing;
-- Do not place admin IDs, service-role keys or privileges in config.js.

-- Prevent a seller from undoing an administrator's hidden status.
create or replace function public.market_enforce_hidden() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.status='hidden' and new.status<>'hidden' and not public.is_local_admin() then
   raise exception 'This listing is hidden by a moderator';
 end if;
 return new;
end;$$;
drop trigger if exists market_hidden_guard on public.market_listings;
create trigger market_hidden_guard before update on public.market_listings
 for each row execute function public.market_enforce_hidden();
