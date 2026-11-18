-- V201: Industry communities and owner oversight. Run AFTER v155, v156 and OWNER-SETUP-v52.
begin;
alter table public.local_venue_directory add column if not exists community_industry text;
alter table public.local_venue_directory add column if not exists community_title text;
alter table public.tl_tables add column if not exists community_label text;
create or replace function public.local_community_title(p_type text) returns text
language sql immutable set search_path='' as $$
 select case
 when lower(coalesce(p_type,'')) ~ 'sport|football|rugby|cricket|golf|bowls' then 'Team Clubhouse'
 when lower(coalesce(p_type,'')) ~ 'veteran|regiment|association|fusilier' then 'Comrades’ Mess'
 when lower(coalesce(p_type,'')) ~ 'charit|nonprofit|volunteer' then 'Supporter Circles'
 when lower(coalesce(p_type,'')) ~ 'community|village|hall' then 'Community Circles'
 when lower(coalesce(p_type,'')) ~ 'music|theatre|entertainment' then 'Backstage Lounge'
 when lower(coalesce(p_type,'')) ~ 'cafe|café|restaurant|coffee' then 'Coffee & Conversation'
 when lower(coalesce(p_type,'')) ~ 'shop|retail|business' then 'Local Connections'
 else 'Virtual Pub Tables' end
$$;
-- Owner-only aggregated monitoring. No cross-tenant message content exposed.
create or replace function public.local_owner_community_overview()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.local_is_owner() then
  raise exception 'Platform owner only' using errcode='42501';
 end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result
 from (
  select v.id,v.name,v.type,v.town,v.status,
    coalesce(nullif(v.community_title,''),public.local_community_title(coalesce(v.community_industry,v.type))) as community_title,
    count(distinct t.id)::int as table_count,
    count(distinct m.user_id) filter(where m.status='approved')::int as members,
    count(distinct p.id) filter(where p.created_at > now()-interval '7 days')::int as posts_7d
  from public.local_venue_directory v
  left join public.tl_tables t on t.venue_id=v.id
  left join public.tl_table_members m on m.table_id=t.id
  left join public.tl_table_posts p on p.table_id=t.id
  group by v.id,v.name,v.type,v.town,v.status,v.community_title,v.community_industry
  order by v.name limit 250
 ) x;
 return result;
end $$;
revoke all on function public.local_owner_community_overview() from public,anon;
grant execute on function public.local_owner_community_overview() to authenticated;
-- Subscriber-safe view of their own community's activity, based on actual table ownership.
create or replace function public.local_my_community_overview()
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into result
 from (
  select v.id,v.name,v.type,
   coalesce(nullif(v.community_title,''),public.local_community_title(coalesce(v.community_industry,v.type))) as community_title,
   count(distinct t.id)::int as table_count,
   count(distinct m.user_id) filter(where m.status='approved')::int as members
  from public.local_venue_directory v
  join public.tl_tables t on t.venue_id=v.id
  where exists(select 1 from public.tl_tables mine where mine.venue_id=v.id and mine.owner_id=auth.uid())
  group by v.id,v.name,v.type,v.community_title,v.community_industry
 ) x;
 return result;
end $$;
revoke all on function public.local_my_community_overview() from public,anon;
grant execute on function public.local_my_community_overview() to authenticated;
commit;
