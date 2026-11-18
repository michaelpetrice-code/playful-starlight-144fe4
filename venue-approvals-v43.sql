-- Run AFTER VENUE-PLATFORM-SETUP.sql (v42).
-- Authorise admins by adding their verified Supabase auth.users UUID to local_venue_admins using SQL Editor.
create table if not exists public.local_venue_admins (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.local_venue_admins enable row level security;
revoke all on public.local_venue_admins from anon, authenticated;
-- No browser access to the admin list. All checks occur in SECURITY DEFINER functions.
grant select (id,name,type,town,contact_email,description,status,created_at) on public.local_venue_applications to authenticated;
drop policy if exists "Venue admins read applications v43" on public.local_venue_applications;
create policy "Venue admins read applications v43" on public.local_venue_applications for select to authenticated
using(exists(select 1 from public.local_venue_admins a where a.user_id=auth.uid()));
create or replace function public.decide_local_venue_application(p_application_id uuid,p_approve boolean)
returns void language plpgsql security definer set search_path='' as $$
declare a public.local_venue_applications%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.local_venue_admins x where x.user_id=auth.uid()) then
  raise exception 'Venue administrator permission required';
 end if;
 select * into a from public.local_venue_applications where id=p_application_id for update;
 if not found then raise exception 'Application not found'; end if;
 if a.status not in ('pending','reviewing') then raise exception 'Application already decided'; end if;
 if p_approve then
  insert into public.local_venue_directory(name,type,town,description,status,verified)
  values(a.name,a.type,a.town,a.description,'approved',false);
 end if;
 update public.local_venue_applications set status=case when p_approve then 'approved' else 'rejected' end where id=a.id;
end $$;
revoke all on function public.decide_local_venue_application(uuid,boolean) from public,anon;
grant execute on function public.decide_local_venue_application(uuid,boolean) to authenticated;
-- Example after identifying your own auth user ID:
-- insert into public.local_venue_admins(user_id) values ('YOUR-VERIFIED-USER-UUID');
