-- Run in The Local Supabase SQL Editor, as project owner.
create table if not exists public.local_safety_committee (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.local_safety_committee enable row level security;
-- No client-facing policies: membership is administered in Supabase SQL Editor.
create table if not exists public.local_safety_reports (
 id uuid primary key default gen_random_uuid(),
 reporter_id uuid not null references auth.users(id),
 created_at timestamptz not null default now(),
 category text not null check(length(category) between 3 and 100),
 location text not null check(length(location) between 1 and 180),
 subject text not null default '' check(length(subject)<=160),
 details text not null check(length(details) between 15 and 4000),
 urgent boolean not null default false,
 status text not null default 'New' check(status in ('New','Under review','Action taken','Closed')),
 committee_notes text not null default '' check(length(committee_notes)<=2000)
);
alter table public.local_safety_reports enable row level security;
create policy "Members submit own safety reports" on public.local_safety_reports
 for insert to authenticated with check (reporter_id=auth.uid() and status='New' and committee_notes='');
create policy "Approved committee view safety reports" on public.local_safety_reports
 for select to authenticated using (exists(select 1 from public.local_safety_committee c where c.user_id=auth.uid()));
create policy "Approved committee update safety reports" on public.local_safety_reports
 for update to authenticated using (exists(select 1 from public.local_safety_committee c where c.user_id=auth.uid()))
 with check (exists(select 1 from public.local_safety_committee c where c.user_id=auth.uid()));
-- IMPORTANT: policy above allows committee reviewers to update all fields, not only status/notes.
-- For production, tighten column-level grants or replace with a SECURITY DEFINER review RPC.
-- Approve committee reviewers only after verifying their UID in Authentication -> Users:
-- insert into public.local_safety_committee(user_id) values ('REPLACE-WITH-REAL-USER-UUID');
