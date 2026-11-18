-- Run in Supabase SQL Editor. Existing is_local_admin() RPC must already exist.
create table if not exists public.local_club_content (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('event','prize','notice','date')),
 title text not null check(length(title) between 1 and 120),
 details text not null default '',
 event_date timestamptz,
 prize_amount numeric(12,2) check(prize_amount>=0),
 status text not null default 'published' check(status in ('published','draft','sold_out')),
 created_at timestamptz not null default now()
);
alter table public.local_club_content enable row level security;
revoke all on public.local_club_content from anon;
grant select on public.local_club_content to anon;
grant select,insert,update,delete on public.local_club_content to authenticated;
drop policy if exists local_club_read on public.local_club_content;
create policy local_club_read on public.local_club_content for select to anon,authenticated using(status <> 'draft' or (auth.uid() is not null and public.is_local_admin()));
drop policy if exists local_club_write on public.local_club_content;
create policy local_club_write on public.local_club_content for all to authenticated using(public.is_local_admin()) with check(public.is_local_admin());
