-- The Local v42: run in your own The Local Supabase SQL editor.
-- Applications are private. Only a trusted server/database administrator approves and publishes.
create table if not exists public.local_venue_applications (
 id uuid primary key default gen_random_uuid(), applicant_id uuid not null references auth.users(id),
 name text not null check(length(name) between 2 and 90),
 type text not null check(length(type) between 2 and 60),
 town text not null check(length(town) between 2 and 90),
 contact_email text not null check(length(contact_email) between 5 and 200),
 description text not null default '' check(length(description)<=700),
 status text not null default 'pending' check(status in ('pending','reviewing','approved','rejected')),
 created_at timestamptz not null default now());
alter table public.local_venue_applications enable row level security;
revoke all on public.local_venue_applications from anon,authenticated;
grant insert(applicant_id,name,type,town,contact_email,description) on public.local_venue_applications to authenticated;
create policy "Applicants submit own venue application v42" on public.local_venue_applications for insert to authenticated
with check(applicant_id=auth.uid() and status='pending');
-- No public SELECT or UPDATE on applications: contact details remain private.
create table if not exists public.local_venue_directory (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 2 and 90),
 type text not null, town text not null,
 description text not null default '', website text,
 status text not null default 'draft' check(status in ('draft','approved','featured','suspended')),
 verified boolean not null default false,
 created_at timestamptz not null default now());
alter table public.local_venue_directory enable row level security;
revoke all on public.local_venue_directory from anon,authenticated;
grant select(id,name,type,town,description,website,status,verified) on public.local_venue_directory to anon,authenticated;
create policy "Public sees published venues v42" on public.local_venue_directory for select to anon,authenticated
using(status in ('approved','featured'));
-- To approve: verify the venue's ownership and consent; then use the trusted SQL editor to
-- INSERT a record in local_venue_directory with status='approved'.
-- Billing is not included. Never treat a submitted application as a paid subscription.
