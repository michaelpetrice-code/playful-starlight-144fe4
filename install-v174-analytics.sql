begin;

create table if not exists public.local_analytics_events (
  visit uuid not null,
  event_day date not null,
  event_name text not null,
  page text not null,
  source text not null,
  campaign text not null,
  device text not null,
  venue text not null default '',
  primary key (visit,event_day,event_name,page,venue)
);
create index if not exists local_analytics_events_day on public.local_analytics_events(event_day);
alter table public.local_analytics_events enable row level security;
revoke all on public.local_analytics_events from public,anon,authenticated;

create or replace function public.local_analytics_record(
  p_visit uuid,p_event text,p_page text,p_source text,p_campaign text,p_device text,p_venue text
) returns void language plpgsql security definer set search_path='' as $$
declare v_venue text := '';
begin
  if p_visit is null
   or not coalesce(p_event in ('view','directory_search','venue_profile','venue_app','install_interest','plan_selected','checkout_opened'),false)
   or not coalesce(p_page ~ '^(home|welcome|for-venues|venue-app|subscription|builder|updates|tables|plans|venues|events|community|marketplace|trades|rounds|photos|football|kitty|quiz|games|arcade|more-games|tournaments|leaderboard|install)$',false)
  then return; end if;
  if p_event in ('venue_profile','venue_app','install_interest') then
    if p_page <> 'venues' then return; end if;
    if p_venue='coombe-social-club' then
      v_venue := p_venue;
    elsif p_venue ~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then
      if not exists(select 1 from public.local_venue_directory d where d.id=p_venue::uuid and d.status in ('approved','featured')) then return; end if;
      v_venue := p_venue;
    else return;
    end if;
  end if;
  insert into public.local_analytics_events(visit,event_day,event_name,page,source,campaign,device,venue)
  values(p_visit,(now() at time zone 'Europe/London')::date,p_event,p_page,
    case when p_source in ('Facebook','Instagram','WhatsApp','TikTok','Google','Bing','Email','QR code','Shared link','Other referral','Other campaign','Direct / unknown') then p_source else 'Direct / unknown' end,
    case when p_campaign ~ '^[a-z0-9][a-z0-9_-]{0,39}$' then p_campaign else '' end,
    case when p_device in ('Mobile','Tablet','Desktop / other') then p_device else 'Desktop / other' end,v_venue)
  on conflict do nothing;
end $$;
revoke all on function public.local_analytics_record(uuid,text,text,text,text,text,text) from public;
grant execute on function public.local_analytics_record(uuid,text,text,text,text,text,text) to anon,authenticated;

create table if not exists public.local_analytics_trials (
  subscription_id text primary key,
  started_day date not null
);
alter table public.local_analytics_trials enable row level security;
revoke all on public.local_analytics_trials from public,anon,authenticated;

create or replace function public.local_analytics_capture_trial() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.live and new.status='trialing' then
    insert into public.local_analytics_trials(subscription_id,started_day)
    values(new.id,(to_timestamp(new.event_at) at time zone 'Europe/London')::date)
    on conflict do nothing;
  end if;
  return new;
end $$;
revoke all on function public.local_analytics_capture_trial() from public,anon,authenticated;
drop trigger if exists local_analytics_trial on public.local_billing_subscriptions;
create trigger local_analytics_trial after insert or update on public.local_billing_subscriptions
for each row execute function public.local_analytics_capture_trial();

-- Report reads aggregated results only. Existing platform permissions govern access.
create or replace function public.local_analytics_report(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare
  today date := (now() at time zone 'Europe/London')::date;
  start_day date;
  from_time timestamptz;
  until_time timestamptz;
  activity jsonb := '{}'::jsonb;
  item record;
  total bigint;
  result jsonb;
begin
  if auth.uid() is null or not (coalesce(public.local_is_owner(),false) or coalesce(public.is_local_admin(),false)) then
    raise exception 'Platform administrator access required' using errcode='42501';
  end if;
  start_day := today - (least(90,greatest(1,coalesce(p_days,30)))-1);
  from_time := start_day::timestamp at time zone 'Europe/London';
  until_time := (today+1)::timestamp at time zone 'Europe/London';

  -- Older installs may have only a subset of the activity tables.
  for item in select * from (values
    ('Tables created','tl_tables'),
    ('Table posts','tl_table_posts'),
    ('Table comments','tl_table_comments'),
    ('Table events created','tl_table_events'),
    ('Table invites created','tl_table_invites'),
    ('Venue applications','local_venue_applications')
  ) as metrics(label,table_name) loop
    if to_regclass('public.' || item.table_name) is not null then
      execute format('select count(*) from public.%I where created_at >= $1 and created_at < $2',item.table_name)
      into total using from_time,until_time;
      activity := activity || jsonb_build_object(item.label,total);
    end if;
  end loop;

  with events as materialized (
    select * from public.local_analytics_events where event_day between start_day and today
  ), daily as (
    select start_day+i as day from generate_series(0,today-start_day) as series(i)
  ), chart as (
    select d.day, count(distinct e.visit) as visits,count(e.visit) filter(where e.event_name='view') as views
    from daily d left join events e on e.event_day=d.day group by d.day
  ), actions as (
    select event_name as name,count(distinct visit) as count from events group by event_name
  ), pages as (
    select page as name,count(*) as count from events where event_name='view'
    group by page order by count desc,page
  ), sources as (
    select source as name,count(distinct visit) as count,
      count(distinct visit) filter(where event_name='checkout_opened') as checkout
    from events group by source order by count desc,source
  ), campaigns as (
    select campaign as name,source,count(distinct visit) as count,
      count(distinct visit) filter(where event_name='checkout_opened') as checkout
    from events where campaign<>'' group by campaign,source order by count desc,campaign,source limit 30
  ), devices as (
    select device as name,count(distinct visit) as count from events group by device order by count desc,device
  ), places as (
    select
      case when e.venue='coombe-social-club' then 'Coombe Social Club' else coalesce(d.name,'Former listing') end as name,
      case when e.venue='coombe-social-club' then 'Coventry' else coalesce(d.town,'Unknown') end as town,
      count(*) filter(where e.event_name='venue_profile') as count,
      count(*) filter(where e.event_name='venue_app') as launches,
      count(*) filter(where e.event_name='install_interest') as installs
    from events e left join public.local_venue_directory d on d.id::text=e.venue
    where e.venue<>'' group by 1,2 order by count desc,1,2 limit 50
  )
  select jsonb_build_object(
    'start',start_day,'end',today,
    'visits',(select count(distinct visit) from events),
    'views',(select count(*) from events where event_name='view'),
    'signups',(select count(*) from auth.users where created_at >= from_time and created_at < until_time),
    'community_activity',activity,
    'trial_starts',(select count(*) from public.local_analytics_trials where started_day between start_day and today),
    'trialing',(select count(*) from public.local_billing_subscriptions where live and status='trialing' and active_until>now()),
    'paid',(select count(*) from public.local_billing_subscriptions where live and status='active' and active_until>now()),
    'trend',(select coalesce(jsonb_agg(to_jsonb(chart) order by day),'[]'::jsonb) from chart),
    'actions',(select coalesce(jsonb_agg(to_jsonb(actions)),'[]'::jsonb) from actions),
    'pages',(select coalesce(jsonb_agg(to_jsonb(pages)),'[]'::jsonb) from pages),
    'sources',(select coalesce(jsonb_agg(to_jsonb(sources)),'[]'::jsonb) from sources),
    'campaigns',(select coalesce(jsonb_agg(to_jsonb(campaigns)),'[]'::jsonb) from campaigns),
    'venues',(select coalesce(jsonb_agg(to_jsonb(places)),'[]'::jsonb) from places),
    'devices',(select coalesce(jsonb_agg(to_jsonb(devices)),'[]'::jsonb) from devices)
  ) into result;
  return result;
end $$;
revoke all on function public.local_analytics_report(integer) from public,anon;
grant execute on function public.local_analytics_report(integer) to authenticated;

commit;
