-- THE LOCAL v146: Run in your existing The Local Supabase project's SQL Editor.
-- Do not run against a different Supabase project.
-- This creates a secure, authenticated application form and administrator-only review.
create extension if not exists pgcrypto;
create table if not exists public.local_venue_applications (
 id uuid primary key default gen_random_uuid(),
 applicant_id uuid not null references auth.users(id),
 name text not null check(length(name) between 2 and 90),
 type text not null check(length(type) between 2 and 60),
 town text not null check(length(town) between 2 and 90),
 contact_email text not null check(length(contact_email) between 5 and 200),
 description text not null default '' check(length(description)<=700),
 status text not null default 'pending' check(status in ('pending','reviewing','approved','rejected')),
 created_at timestamptz not null default now()
);
create table if not exists public.local_venue_directory (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 2 and 90),
 type text not null, town text not null,
 description text not null default '', website text,
 status text not null default 'draft' check(status in ('draft','approved','featured','suspended')),
 verified boolean not null default false,
 created_at timestamptz not null default now()
);
create table if not exists public.local_venue_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.local_venue_applications enable row level security;
alter table public.local_venue_directory enable row level security;
alter table public.local_venue_admins enable row level security;
revoke all on public.local_venue_applications from anon, authenticated;
revoke all on public.local_venue_directory from anon, authenticated;
revoke all on public.local_venue_admins from anon, authenticated;
grant insert(applicant_id,name,type,town,contact_email,description) on public.local_venue_applications to authenticated;
grant select(id,name,type,town,contact_email,description,status,created_at) on public.local_venue_applications to authenticated;
grant select(id,name,type,town,description,website,status,verified) on public.local_venue_directory to anon,authenticated;
drop policy if exists "Applicants submit own venue application v42" on public.local_venue_applications;
create policy "Applicants submit own venue application v42" on public.local_venue_applications
for insert to authenticated with check(applicant_id=auth.uid() and status='pending');
drop policy if exists "Venue admins read applications v43" on public.local_venue_applications;
create policy "Venue admins read applications v43" on public.local_venue_applications
for select to authenticated using(exists(select 1 from public.local_venue_admins a where a.user_id=auth.uid()));
drop policy if exists "Public sees published venues v42" on public.local_venue_directory;
create policy "Public sees published venues v42" on public.local_venue_directory
for select to anon,authenticated using(status in ('approved','featured'));
create table if not exists public.local_venue_application_audit (
 id uuid primary key default gen_random_uuid(),
 application_id uuid not null references public.local_venue_applications(id),
 actor_id uuid not null references auth.users(id),
 decision text not null check(decision in ('approved','rejected')),
 created_at timestamptz not null default now()
);
alter table public.local_venue_application_audit enable row level security;
revoke all on public.local_venue_application_audit from anon,authenticated;
create or replace function public.decide_local_venue_application(p_application_id uuid,p_approve boolean)
returns void language plpgsql security definer set search_path='' as $$
declare a public.local_venue_applications%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.local_venue_admins x where x.user_id=auth.uid()) then
  raise exception 'Platform administrator permission required';
 end if;
 select * into a from public.local_venue_applications where id=p_application_id for update;
 if not found then raise exception 'Application not found'; end if;
 if a.status not in ('pending','reviewing') then raise exception 'Application already decided'; end if;
 if p_approve then
  insert into public.local_venue_directory(name,type,town,description,status,verified)
  values(a.name,a.type,a.town,a.description,'approved',false);
 end if;
 update public.local_venue_applications set status=case when p_approve then 'approved' else 'rejected' end where id=a.id;
 insert into public.local_venue_application_audit(application_id,actor_id,decision)
 values(a.id,auth.uid(),case when p_approve then 'approved' else 'rejected' end);
end $$;
revoke all on function public.decide_local_venue_application(uuid,boolean) from public,anon;
grant execute on function public.decide_local_venue_application(uuid,boolean) to authenticated;
-- REQUIRED: add your verified platform owner UUID (from Supabase Authentication > Users):
-- insert into public.local_venue_admins(user_id) values ('YOUR-VERIFIED-UUID') on conflict do nothing;
-- Never put a service_role key in the browser or give all venue owners platform-admin access.
