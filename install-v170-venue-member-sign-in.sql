begin;
create unique index if not exists tl_auth_coombe_subject_unique
on auth.users ((raw_app_meta_data->>'tl_venue_subject'))
where raw_app_meta_data->>'tl_venue_provider'='coombe';
create or replace function public.tl_venue_member_identity(p_subject uuid, p_email text)
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'linked', (select jsonb_build_object('id',id,'email',email,'banned_until',banned_until)
    from auth.users where raw_app_meta_data->>'tl_venue_provider'='coombe'
     and raw_app_meta_data->>'tl_venue_subject'=p_subject::text limit 1),
  'email_exists', exists(select 1 from auth.users where lower(email)=lower(p_email))
 );
$$;
revoke all on function public.tl_venue_member_identity(uuid,text) from public,anon,authenticated;
grant execute on function public.tl_venue_member_identity(uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
