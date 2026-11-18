-- Run in the SAME Supabase project as The Local and Coombe Social Club.
-- Requests are private and cannot publish venues or create admin privileges.
create table if not exists public.local_venue_app_requests (
 id uuid primary key default gen_random_uuid(),
 applicant_id uuid not null references auth.users(id) on delete cascade,
 venue_name text not null check(length(venue_name) between 2 and 90),
 town text not null check(length(town) between 2 and 90),
 venue_type text not null check(length(venue_type) between 2 and 60),
 contact_name text not null check(length(contact_name) between 2 and 100),
 contact_email text not null check(length(contact_email) between 5 and 200),
 app_name text not null check(length(app_name) between 2 and 90),
 package_key text not null check(package_key in ('club','pub','full')),
 notes text not null default '' check(length(notes)<=1000),
 status text not null default 'pending' check(status in ('pending','reviewing','approved','rejected')),
 created_at timestamptz not null default now()
);
alter table public.local_venue_app_requests enable row level security;
revoke all on public.local_venue_app_requests from anon, authenticated;
grant insert(applicant_id,venue_name,town,venue_type,contact_name,contact_email,app_name,package_key,notes) on public.local_venue_app_requests to authenticated;
drop policy if exists "Venue app requests: submit own" on public.local_venue_app_requests;
create policy "Venue app requests: submit own" on public.local_venue_app_requests for insert to authenticated
 with check (applicant_id=auth.uid() and status='pending');
-- No client SELECT/UPDATE/DELETE access: review securely in Supabase dashboard.
-- Approval and venue app provisioning are manual until a trusted backend is installed.
