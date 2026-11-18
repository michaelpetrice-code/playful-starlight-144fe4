-- Run ONCE in Supabase SQL Editor. All Marketplace data is GLOBAL across groups.
create table if not exists public.market_listings (
 id uuid primary key default gen_random_uuid(), seller_id uuid not null references auth.users(id) on delete cascade,
 title text not null check (length(trim(title)) between 1 and 120),
 description text not null check (length(trim(description)) between 1 and 3000),
 category text not null, type text not null check (type in ('Sale','Free','Swap')),
 price numeric(10,2) not null default 0 check (price >= 0),
 condition text not null default 'Good', area text not null default '',
 photo_paths text[] not null default '{}', status text not null default 'available' check (status in ('available','sold')),
 created_at timestamptz not null default now()
);
create index if not exists market_listings_created on public.market_listings(created_at desc);
create table if not exists public.market_messages (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.market_listings(id) on delete cascade,
 sender_id uuid not null references auth.users(id) on delete cascade,
 recipient_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('enquiry','offer','reply')),
 body text not null check(length(trim(body)) between 1 and 1000), created_at timestamptz not null default now(),
 check(sender_id <> recipient_id)
);
create index if not exists market_messages_users on public.market_messages(sender_id,recipient_id,created_at desc);
create table if not exists public.market_reports (
 id uuid primary key default gen_random_uuid(), listing_id uuid not null references public.market_listings(id) on delete cascade,
 reporter_id uuid not null references auth.users(id) on delete cascade,
 reason text not null check(length(trim(reason)) between 1 and 1000),
 created_at timestamptz not null default now(), reviewed boolean not null default false
);
alter table public.market_listings enable row level security;
alter table public.market_messages enable row level security;
alter table public.market_reports enable row level security;
drop policy if exists "market_read" on public.market_listings;
create policy "market_read" on public.market_listings for select to authenticated using (true);
drop policy if exists "market_create" on public.market_listings;
create policy "market_create" on public.market_listings for insert to authenticated with check (seller_id=auth.uid());
drop policy if exists "market_edit" on public.market_listings;
create policy "market_edit" on public.market_listings for update to authenticated using (seller_id=auth.uid()) with check(seller_id=auth.uid());
drop policy if exists "market_delete" on public.market_listings;
create policy "market_delete" on public.market_listings for delete to authenticated using (seller_id=auth.uid());
drop policy if exists "market_messages_read" on public.market_messages;
create policy "market_messages_read" on public.market_messages for select to authenticated using(sender_id=auth.uid() or recipient_id=auth.uid());
-- Messages can be sent to a listing owner, or replies from a seller to someone who contacted them.
drop policy if exists "market_messages_send" on public.market_messages;
create policy "market_messages_send" on public.market_messages for insert to authenticated with check (
 sender_id=auth.uid() and (
  exists(select 1 from public.market_listings l where l.id=listing_id and l.seller_id=recipient_id and sender_id<>recipient_id)
  or (exists(select 1 from public.market_listings l where l.id=listing_id and l.seller_id=sender_id)
    and exists(select 1 from public.market_messages m where m.listing_id=market_messages.listing_id and m.sender_id=recipient_id and m.recipient_id=sender_id))
 )
);
drop policy if exists "market_reports_submit" on public.market_reports;
create policy "market_reports_submit" on public.market_reports for insert to authenticated with check(reporter_id=auth.uid());
-- Reports are intentionally NOT readable from client apps. Moderators review in Supabase Dashboard.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('marketplace-photos','marketplace-photos',false,5000000,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5000000,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "market_photo_read" on storage.objects;
create policy "market_photo_read" on storage.objects for select to authenticated using(bucket_id='marketplace-photos');
drop policy if exists "market_photo_upload" on storage.objects;
create policy "market_photo_upload" on storage.objects for insert to authenticated with check(bucket_id='marketplace-photos' and (storage.foldername(name))[1]=auth.uid()::text);
