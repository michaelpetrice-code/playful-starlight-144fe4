
-- The Local v52 OWNER ONLY dashboard.
-- Run in Supabase SQL Editor. Then replace the placeholder UUID in the last
-- INSERT with the UUID of YOUR own authenticated account from Authentication > Users.
-- Never put an owner UUID, service-role key or password into browser config.js.
create table if not exists public.local_platform_owners (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.local_platform_owners enable row level security;
revoke all on public.local_platform_owners from public, anon, authenticated;
create or replace function public.local_is_owner()
returns boolean language sql stable security definer set search_path=''
as $$select auth.uid() is not null and exists(
 select 1 from public.local_platform_owners o where o.user_id=auth.uid()
)$$;
revoke all on function public.local_is_owner() from public, anon;
grant execute on function public.local_is_owner() to authenticated;

create or replace function public.local_owner_metrics()
returns jsonb language plpgsql security definer set search_path=''
as $$
declare result jsonb='{}'::jsonb; t text; k text; n bigint; predicate text;
begin
 if not public.local_is_owner() then raise exception 'Owner access required' using errcode='42501'; end if;
 for k,t,predicate in
 select * from (values
  ('members','auth.users',''),
  ('venues','public.local_venue_directory',' where status = ''approved'''),
  ('venue_applications','public.local_venue_applications',' where status = ''pending'''),
  ('posts','public.posts',''),
  ('marketplace','public.market_listings',''),
  ('pending_trades','public.local_trades',' where status = ''pending'''),
  ('market_reports','public.market_reports',' where reviewed = false'),
  ('trade_reports','public.local_trade_reports',' where reviewed = false')
 ) as x(k,t,predicate)
 loop
  if to_regclass(t) is null then result=result||jsonb_build_object(k,null);continue;end if;
  begin
   execute 'select count(*) from '||t||predicate into n;
   result=result||jsonb_build_object(k,n);
  exception when undefined_column then
   result=result||jsonb_build_object(k,null);
  end;
 end loop;
 return result;
end $$;
revoke all on function public.local_owner_metrics() from public, anon;
grant execute on function public.local_owner_metrics() to authenticated;

-- REQUIRED: replace with YOUR UUID, then run this line separately:
-- insert into public.local_platform_owners(user_id) values ('YOUR-AUTH-USER-UUID');
-- Owner access cannot be activated without this explicit database step.
