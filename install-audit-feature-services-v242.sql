-- Additive repairs for existing public directory and member application screens.
-- Existing directory rows, membership and grants are preserved.
alter table public.local_venue_directory add column if not exists app_url text;
alter table public.local_venue_directory add column if not exists builder_app_slug text;
create or replace function public.local_directory_app_links() returns table(venue_id uuid,app_url text,published_app_slug text)
language sql stable security definer set search_path='' as $$
 select v.id,case when v.app_url ~ '^https://[^[:space:]]+$' and length(v.app_url)<=1024 then v.app_url end,a.slug
 from public.local_venue_directory v left join public.local_builder_apps a on a.slug=v.builder_app_slug and a.published is not null and public.local_builder_account_active(a.owner_id)
 where v.status in ('approved','featured') and (v.app_url is not null or a.slug is not null);
$$;
revoke all on function public.local_directory_app_links() from public,anon,authenticated;
grant execute on function public.local_directory_app_links() to anon,authenticated;
update public.local_venue_directory set app_url='https://stellar-mandazi-6aa7db.netlify.app/' where lower(btrim(name)) in ('coombe social club','the coombe social club') and lower(btrim(town))='coventry' and app_url is null;
create table public.local_venue_applications (
 id uuid primary key default gen_random_uuid(),applicant_id uuid not null references auth.users(id),
 name text not null check(length(name) between 2 and 90),type text not null check(length(type) between 2 and 60),town text not null check(length(town) between 2 and 90),
 contact_email text not null check(length(contact_email) between 5 and 200),description text not null default '' check(length(description)<=700),
 status text not null default 'pending' check(status in ('pending','reviewing','approved','rejected')),created_at timestamptz not null default now()
);
alter table public.local_venue_applications enable row level security;
revoke all on public.local_venue_applications from public,anon,authenticated;
grant insert(applicant_id,name,type,town,contact_email,description) on public.local_venue_applications to authenticated;
grant select on public.local_venue_applications to authenticated;
grant all on public.local_venue_applications to service_role;
create policy "Applicants submit their own venue application" on public.local_venue_applications for insert to authenticated with check(applicant_id=(select auth.uid()) and status='pending');
create policy "Applicants and owner read venue applications" on public.local_venue_applications for select to authenticated using(applicant_id=(select auth.uid()) or public.local_is_owner());
create table public.local_venue_application_audit(id uuid primary key default gen_random_uuid(),application_id uuid not null references public.local_venue_applications(id),actor_id uuid not null references auth.users(id),decision text not null check(decision in ('approved','rejected')),created_at timestamptz not null default now());
alter table public.local_venue_application_audit enable row level security;
revoke all on public.local_venue_application_audit from public,anon,authenticated;
grant all on public.local_venue_application_audit to service_role;
create policy "Service manages application audit" on public.local_venue_application_audit for all to service_role using(true) with check(true);
create function public.decide_local_venue_application(p_application_id uuid,p_approve boolean) returns void language plpgsql security definer set search_path='' as $$
 declare application public.local_venue_applications%rowtype;begin
 if auth.uid() is null or not public.local_is_owner() then raise exception 'Platform owner required' using errcode='42501';end if;
 select * into application from public.local_venue_applications where id=p_application_id for update;
 if not found then raise exception 'Application not found';end if;
 if application.status not in ('pending','reviewing') then raise exception 'Application already decided';end if;
 if p_approve then insert into public.local_venue_directory(name,type,town,description,status,verified) values(application.name,application.type,application.town,application.description,'approved',false);end if;
 update public.local_venue_applications set status=case when p_approve then 'approved' else 'rejected' end where id=application.id;
 insert into public.local_venue_application_audit(application_id,actor_id,decision) values(application.id,auth.uid(),case when p_approve then 'approved' else 'rejected' end);
 end;
$$;
revoke all on function public.decide_local_venue_application(uuid,boolean) from public,anon;
grant execute on function public.decide_local_venue_application(uuid,boolean) to authenticated;
create table public.local_venue_app_requests (
 id uuid primary key default gen_random_uuid(),applicant_id uuid not null references auth.users(id),venue_name text not null check(length(venue_name) between 2 and 90),town text not null check(length(town) between 2 and 90),venue_type text not null check(length(venue_type) between 2 and 60),contact_name text not null check(length(contact_name) between 2 and 100),contact_email text not null check(length(contact_email) between 5 and 200),app_name text not null check(length(app_name) between 2 and 90),package_key text not null check(package_key in ('club','pub','full')),notes text not null default '' check(length(notes)<=1000),status text not null default 'pending' check(status in ('pending','reviewing','approved','rejected')),created_at timestamptz not null default now()
);
alter table public.local_venue_app_requests enable row level security;
revoke all on public.local_venue_app_requests from public,anon,authenticated;
grant insert(applicant_id,venue_name,town,venue_type,contact_name,contact_email,app_name,package_key,notes) on public.local_venue_app_requests to authenticated;
grant select on public.local_venue_app_requests to authenticated;grant all on public.local_venue_app_requests to service_role;
create policy "Members submit own app requests" on public.local_venue_app_requests for insert to authenticated with check(applicant_id=(select auth.uid()) and status='pending');
create policy "Members and owner read app requests" on public.local_venue_app_requests for select to authenticated using(applicant_id=(select auth.uid()) or public.local_is_owner());
create table public.local_builder_notification_settings(owner_id uuid primary key references auth.users(id) on delete cascade,settings jsonb not null default '{}'::jsonb,updated_at timestamptz not null default now());
alter table public.local_builder_notification_settings enable row level security;
revoke all on public.local_builder_notification_settings from public,anon,authenticated;
grant select,insert,update on public.local_builder_notification_settings to authenticated;
grant all on public.local_builder_notification_settings to service_role;
create policy "Owners read own builder alert choices" on public.local_builder_notification_settings for select to authenticated using(owner_id=(select auth.uid()));
create policy "Owners insert own builder alert choices" on public.local_builder_notification_settings for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "Owners update own builder alert choices" on public.local_builder_notification_settings for update to authenticated using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
