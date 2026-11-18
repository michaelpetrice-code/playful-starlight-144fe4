-- The Local v197: privacy-preserving, owner-only aggregate UK location reporting.
-- Towns with fewer than three registered members are suppressed.
create or replace function public.local_owner_uk_coverage()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare member_counts jsonb; venue_counts jsonb;
begin
 if auth.uid() is null or not coalesce(public.local_is_owner(),false) then
   raise exception 'Platform owner access required' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('town',town,'count',n) order by n desc),'[]'::jsonb) into member_counts
 from (select left(trim(coalesce(nullif(raw_user_meta_data->>'town',''),nullif(raw_user_meta_data->>'city',''),'')),100) town,count(*) n from auth.users group by 1 having count(*) >= 3) t where town<>'';
 -- Venue schema may vary between installations. Convert rows to JSONB to read only fields that exist.
 if to_regclass('public.platform_venues') is not null then
  execute $q$ select coalesce(jsonb_agg(jsonb_build_object('town',town,'count',n) order by n desc),'[]'::jsonb)
   from (select left(trim(coalesce(nullif(to_jsonb(v)->>'town',''),nullif(to_jsonb(v)->>'city',''),'')),100) town,count(*) n from public.platform_venues v group by 1) t where town<>'' $q$ into venue_counts;
 else venue_counts:='[]'::jsonb;end if;
 return jsonb_build_object('members',coalesce(member_counts,'[]'::jsonb),'venues',coalesce(venue_counts,'[]'::jsonb));
end $$;
revoke all on function public.local_owner_uk_coverage() from public,anon;
grant execute on function public.local_owner_uk_coverage() to authenticated;
