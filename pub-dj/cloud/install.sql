-- Hosted DJ queue. All writes require the trusted Edge Function, never browser table access.
create table public.local_dj_checkouts(id text primary key,user_id uuid not null references auth.users(id),venue_id uuid references public.local_venue_directory(id),plan text not null check(plan in ('venue_monthly','subscriber_monthly','party_once')),status text not null default 'open',access_until timestamptz,checked_at timestamptz,created_at timestamptz not null default now());
create index local_dj_checkouts_user on public.local_dj_checkouts(user_id,created_at desc);
create table public.local_dj_rooms(id uuid primary key default gen_random_uuid(),code text not null unique check(code ~ '^[0-9]{6}$'),host_id uuid not null references auth.users(id),venue_id uuid references public.local_venue_directory(id),name text not null check(length(name) between 1 and 90),tracks jsonb not null default '[]',current jsonb,requests_open boolean not null default true,mood text not null default 'All music',expires_at timestamptz not null,created_at timestamptz not null default now(),party_checkout text unique references public.local_dj_checkouts(id),playback_client text);
create table public.local_dj_members(token_hash text primary key,room_id uuid not null references public.local_dj_rooms(id) on delete cascade,created_at timestamptz not null default now());
create index local_dj_members_room on public.local_dj_members(room_id);
create table public.local_dj_requests(id bigint generated always as identity primary key,room_id uuid not null references public.local_dj_rooms(id) on delete cascade,track text not null,member text not null references public.local_dj_members(token_hash),status text not null default 'pending' check(status in ('pending','approved','rejected','played')),created_at timestamptz not null default now());
create unique index local_dj_unique_queued on public.local_dj_requests(room_id,track) where status in ('pending','approved');
create index local_dj_requests_room on public.local_dj_requests(room_id,status);
create table public.local_dj_votes(request_id bigint not null references public.local_dj_requests(id) on delete cascade,member text not null references public.local_dj_members(token_hash),primary key(request_id,member));
create table public.local_dj_checkout_leases(scope text primary key,key uuid not null default gen_random_uuid(),expires_at bigint not null);
create table public.local_dj_rate_limits(key text primary key,window_at timestamptz not null,attempts integer not null);
do $$declare t text;begin foreach t in array array['local_dj_checkouts','local_dj_rooms','local_dj_members','local_dj_requests','local_dj_votes','local_dj_rate_limits','local_dj_checkout_leases'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant all on public.%I to service_role',t);execute format('create policy "Trusted DJ service only" on public.%I for all to service_role using(true) with check(true)',t);end loop;end$$;
grant usage,select on sequence public.local_dj_requests_id_seq to service_role;
create function public.local_dj_access(p_user uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 with venues as (
 select v.id,v.name,coalesce(a.owner_id,q.user_id) owner_id from public.local_venue_directory v left join public.local_builder_apps a on a.slug=v.builder_app_slug left join public.local_quiz_venue_owners q on q.venue_id=v.id
 where v.status in ('approved','featured') and (a.owner_id=p_user or q.user_id=p_user or (v.id='65da0d42-64b0-47a7-852c-997c1ea03b18'::uuid and exists(select 1 from public.local_quiz_coombe_hosts h where h.user_id=p_user)) or exists(select 1 from public.local_platform_owners o where o.user_id=p_user) or exists(select 1 from public.local_builder_team_members m where m.owner_id=a.owner_id and m.user_id=p_user))
 ) select jsonb_build_object('personal',exists(select 1 from public.local_dj_complimentary_access g where g.user_id=p_user and (g.expires_at is null or g.expires_at>now())), 'venues',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'complimentary',exists(select 1 from public.local_dj_complimentary_access g where g.venue_id=v.id and (g.expires_at is null or g.expires_at>now())),'subscriber',exists(select 1 from public.local_billing_subscriptions s where s.user_id=v.owner_id and s.live and s.status='active' and s.active_until>now()))) from venues v),'[]'::jsonb));
$$;
create function public.local_dj_rate(p_key text) returns boolean language plpgsql security invoker set search_path='' as $$declare n integer;begin
 delete from public.local_dj_rate_limits where window_at<now()-interval '10 minutes';
 insert into public.local_dj_rate_limits values(p_key,date_trunc('minute',now()),1) on conflict(key) do update set attempts=case when local_dj_rate_limits.window_at<date_trunc('minute',now()) then 1 else local_dj_rate_limits.attempts+1 end,window_at=date_trunc('minute',now()) returning attempts into n;return n<=20;end$$;
create function public.local_dj_command(p_code text,p_host uuid,p_member text,p_action text,p_data jsonb default '{}') returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.local_dj_rooms;is_host boolean;joined boolean;track_id text;rid bigint;q jsonb;cfg jsonb;candidate jsonb;begin
 select * into r from public.local_dj_rooms where code=p_code and expires_at>now() for update;
 if not found then raise exception 'Room not found or expired';end if;
 is_host:=p_host is not null and p_host=r.host_id;
 joined:=exists(select 1 from public.local_dj_members m where m.token_hash=p_member and m.room_id=r.id);
 if p_action='join' then
  if coalesce(length(p_member),0)<>64 then raise exception 'Invalid member';end if;
  if (select count(*) from public.local_dj_members where room_id=r.id)>=500 and not joined then raise exception 'Room full';end if;
  insert into public.local_dj_members(token_hash,room_id) values(p_member,r.id) on conflict do nothing;joined:=true;
 elsif p_action='request' or p_action='vote' then
  if not joined or not r.requests_open then raise exception 'Join this venue and wait for requests to open';end if;
  if p_action='request' then
   track_id:=p_data->>'track';if not exists(select 1 from jsonb_array_elements(r.tracks) t where t->>'id'=track_id) then raise exception 'Song unavailable';end if;
   if (select count(*) from public.local_dj_requests where member=p_member and created_at>now()-interval '10 minutes')>=3 then raise exception 'Three requests per ten minutes';end if;
   insert into public.local_dj_requests(room_id,track,member) values(r.id,track_id,p_member);
  else
   rid:=(p_data->>'id')::bigint;if not exists(select 1 from public.local_dj_requests where id=rid and room_id=r.id and status='approved') then raise exception 'Request unavailable';end if;
   insert into public.local_dj_votes values(rid,p_member) on conflict do nothing;
  end if;
 elsif p_action<>'state' then
  if not is_host then raise exception 'Staff access required';end if;
  if p_action='moderate' then
   if p_data->>'status' not in ('approved','rejected') then raise exception 'Invalid decision';end if;
   update public.local_dj_requests set status=p_data->>'status' where id=(p_data->>'id')::bigint and room_id=r.id and status in ('pending','approved');
  elsif p_action='catalogue' then
   cfg:=p_data->'tracks';if jsonb_typeof(cfg)<>'array' or jsonb_array_length(cfg)>500 or octet_length(cfg::text)>250000 then raise exception 'Use up to 500 tracks';end if;
   if exists(select 1 from jsonb_array_elements(cfg) t where coalesce(t->>'id','')!~'^[a-zA-Z0-9_-]{1,80}$' or coalesce(length(t->>'title'),0) not between 1 and 140 or coalesce(length(t->>'artist'),0) not between 1 and 140 or coalesce(length(t->>'mood'),0) not between 1 and 60) or (select count(distinct t->>'id') from jsonb_array_elements(cfg) t)<>jsonb_array_length(cfg) then raise exception 'Invalid catalogue';end if;
   update public.local_dj_rooms set tracks=cfg,current=case when exists(select 1 from jsonb_array_elements(cfg) t where t->>'id'=r.current->>'track') then r.current else null end where id=r.id;
   update public.local_dj_requests a set status='rejected' where room_id=r.id and status in ('pending','approved') and not exists(select 1 from jsonb_array_elements(cfg) t where t->>'id'=a.track);
  elsif p_action='settings' then
   if p_data?'open' then if jsonb_typeof(p_data->'open')<>'boolean' then raise exception 'Invalid setting';end if;update public.local_dj_rooms set requests_open=(p_data->>'open')::boolean where id=r.id;end if;
   if p_data?'mode' then if p_data->>'mode'<>'All music' and not exists(select 1 from jsonb_array_elements(r.tracks) t where t->>'mood'=p_data->>'mode') then raise exception 'Unknown mood';end if;update public.local_dj_rooms set mood=p_data->>'mode' where id=r.id;end if;
  elsif p_action='claim' then update public.local_dj_rooms set playback_client=p_data->>'client' where id=r.id;
  elsif p_action='stop' or p_action='next' then
   if coalesce(r.playback_client,'')<>coalesce(p_data->>'client','') or r.playback_client is null then raise exception 'Claim playback on this device first';end if;
   if p_action='stop' then update public.local_dj_rooms set current=null where id=r.id;
   else
    select req.id,req.track into rid,track_id from public.local_dj_requests req where req.room_id=r.id and req.status='approved' and exists(select 1 from jsonb_array_elements(r.tracks) t where t->>'id'=req.track) order by (select count(*) from public.local_dj_votes v where v.request_id=req.id) desc,req.created_at asc,req.id asc limit 1;
    if track_id is not null then update public.local_dj_requests set status='played' where id=rid;
    else select t into candidate from jsonb_array_elements(r.tracks) t where r.mood='All music' or t->>'mood'=r.mood order by (t->>'id'=coalesce(r.current->>'track','')),random() limit 1;track_id:=candidate->>'id';end if;
    update public.local_dj_rooms set current=case when track_id is null then null else jsonb_build_object('track',track_id,'started',extract(epoch from clock_timestamp())) end where id=r.id;
   end if;
  else raise exception 'Unknown action';end if;
 end if;
 select * into r from public.local_dj_rooms where id=r.id;
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id::text,'track',a.track,'status',a.status,'votes',(select count(*) from public.local_dj_votes v where v.request_id=a.id),'voted',exists(select 1 from public.local_dj_votes v where v.request_id=a.id and v.member=p_member)) order by a.created_at,a.id),'[]') into q from public.local_dj_requests a where a.room_id=r.id and a.status in ('pending','approved') and (a.status='approved' or is_host or a.member=p_member);
 return jsonb_build_object('venue',r.name,'code',r.code,'host',is_host,'joined',joined,'open',r.requests_open,'mode',r.mood,'tracks',case when joined or is_host then r.tracks else '[]'::jsonb end,'queue',case when joined or is_host then q else '[]'::jsonb end,'current',case when joined or is_host then r.current else null end,'cloud',true,'playback_client',case when is_host then r.playback_client else null end);
end$$;
revoke all on function public.local_dj_access(uuid),public.local_dj_rate(text),public.local_dj_command(text,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.local_dj_access(uuid),public.local_dj_rate(text),public.local_dj_command(text,uuid,text,text,jsonb) to service_role;

create function public.local_dj_reserve_checkout(p_scope text) returns jsonb language plpgsql security invoker set search_path='' as $$declare lease public.local_dj_checkout_leases;begin
 insert into public.local_dj_checkout_leases(scope,expires_at) values(p_scope,floor(extract(epoch from now()))+1860)
 on conflict(scope) do update set key=gen_random_uuid(),expires_at=excluded.expires_at where local_dj_checkout_leases.expires_at<extract(epoch from now()) returning * into lease;
 if not found then select * into lease from public.local_dj_checkout_leases where scope=p_scope;end if;
 return jsonb_build_object('key',lease.key,'expires_at',lease.expires_at);
end$$;
revoke all on function public.local_dj_reserve_checkout(text) from public,anon,authenticated;
grant execute on function public.local_dj_reserve_checkout(text) to service_role;
