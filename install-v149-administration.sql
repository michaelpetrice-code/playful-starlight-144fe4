begin;
create or replace function public.local_administration_roles()
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare can_review boolean := false; can_moderate boolean := false; caller uuid := auth.uid();
begin
 if caller is not null and to_regclass('public.local_venue_admins') is not null then
  execute 'select exists(select 1 from public.local_venue_admins where user_id=$1)' into can_review using caller;
 end if;
 if caller is not null and to_regclass('public.local_safety_committee') is not null then
  execute 'select exists(select 1 from public.local_safety_committee where user_id=$1)' into can_moderate using caller;
 end if;
 return jsonb_build_object('applications',can_review,'safety',can_moderate);
end $$;
revoke all on function public.local_administration_roles() from public, anon;
grant execute on function public.local_administration_roles() to authenticated;

-- Read permissions without exposing the administrator roster or rewriting the existing review rules.
create or replace function public.local_can_review_venue_applications()
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((public.local_administration_roles()->>'applications')::boolean,false)
$$;
revoke all on function public.local_can_review_venue_applications() from public,anon;
grant execute on function public.local_can_review_venue_applications() to authenticated;
do $$
begin
 if to_regclass('public.local_venue_applications') is not null then
  execute 'drop policy if exists "Venue admins read applications v43" on public.local_venue_applications';
  execute 'create policy "Venue admins read applications v43" on public.local_venue_applications for select to authenticated using (public.local_can_review_venue_applications())';
 end if;
end $$;
commit;
