-- The Local v196: owner-only member contact directory.
-- Run in the same Supabase project as The Local. No new tracking or permissions granted to venue admins.
create or replace function public.local_owner_member_directory(p_limit integer default 500)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
 if auth.uid() is null or not coalesce(public.local_is_owner(),false) then
   raise exception 'Platform owner access required' using errcode='42501';
 end if;
 select jsonb_build_object(
   'total', (select count(*) from auth.users),
   'members', coalesce(jsonb_agg(jsonb_build_object(
     'id',u.id,'joined',u.created_at,'last_seen',u.last_sign_in_at,
     'email',coalesce(u.email,''),
     'name',left(coalesce(nullif(u.raw_user_meta_data->>'full_name',''),nullif(u.raw_user_meta_data->>'display_name',''),nullif(u.raw_user_meta_data->>'name',''),''),120),
     'phone',left(coalesce(nullif(u.phone,''),nullif(u.raw_user_meta_data->>'phone',''),''),50),
     'town',left(coalesce(nullif(u.raw_user_meta_data->>'town',''),nullif(u.raw_user_meta_data->>'city',''),''),100),
     'region',left(coalesce(nullif(u.raw_user_meta_data->>'county',''),nullif(u.raw_user_meta_data->>'region',''),''),100),
     'postcode',left(coalesce(u.raw_user_meta_data->>'postcode',''),20),
     'country',left(coalesce(u.raw_user_meta_data->>'country',''),80)
   ) order by u.created_at desc),'[]'::jsonb)
 ) into result
 from (select * from auth.users order by created_at desc limit least(greatest(coalesce(p_limit,500),1),1000)) u;
 return result;
end $$;
revoke all on function public.local_owner_member_directory(integer) from public,anon;
grant execute on function public.local_owner_member_directory(integer) to authenticated;
