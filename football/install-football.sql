-- Additive migration. Does not touch the existing football prediction records.
begin;
create table if not exists public.tl_football_leagues (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 invite uuid not null unique default gen_random_uuid(),
 doc jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.tl_football_leagues add column if not exists slug text unique default ('league-'||substr(replace(gen_random_uuid()::text,'-',''),1,12));
alter table public.tl_football_leagues enable row level security;
revoke all on public.tl_football_leagues from anon,authenticated;
-- All access is via this locked RPC, with membership and action checks.
create or replace function public.tl_football_settled(d jsonb)
returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare v jsonb;p jsonb;f jsonb;ms jsonb;survivors int:=0;winner text;won boolean;rolled boolean:=false;deadline timestamptz:=(d->>'deadline')::timestamptz;
begin
 if jsonb_array_length(d->'fixtures')=0 then raise exception 'Add fixtures before settling';end if;
  if now()<deadline or d->>'status'<>'playing' then raise exception 'Round is not ready to settle';end if;
  ms:='[]';
  for v in select value from jsonb_array_elements(d->'members') loop
   if (v->>'active')::boolean and (v->>'approved')::boolean then
    select value into p from jsonb_array_elements(d->'picks') where value->>'user_id'=v->>'user_id';won:=false;
    if p is not null then
     select value into f from jsonb_array_elements(d->'fixtures') where value->>'home'=p->>'team' or value->>'away'=p->>'team';
     if f is null or f->>'status'<>'FT' then raise exception 'All picked fixtures need final results';end if;
     won:=case when f->>'home'=p->>'team' then (f->>'home_score')::int>(f->>'away_score')::int else (f->>'away_score')::int>(f->>'home_score')::int end;
    end if;
    v:=v||jsonb_build_object('active',won);if won then survivors:=survivors+1;winner:=v->>'user_id';end if;
   end if;
   ms:=ms||jsonb_build_array(v);
  end loop;
  rolled:=survivors=0 and d->>'rollover'='replay';
  if rolled then ms:=d->'members';end if;
  d:=d||jsonb_build_object('rolled_over',rolled,'members',ms,'status',case when rolled then 'round-complete' when survivors=0 then 'all-out' when survivors=1 then 'complete' else 'round-complete' end,'winner',case when survivors=1 then winner else null end);

return d;end;$$;
revoke all on function public.tl_football_settled(jsonb) from public,anon,authenticated;

create or replace function public.tl_football(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 u uuid:=auth.uid(); l public.tl_football_leagues; d jsonb; m jsonb; f jsonb; p jsonb; v jsonb;
 ms jsonb; ps jsonb; fs jsonb; hs jsonb; result jsonb; target text; team text; deadline timestamptz;
 own boolean; staff boolean; active boolean; won boolean; rolled boolean:=false; survivors int:=0; winner text; n int;
begin
 if u is null then raise exception 'Sign in to use shared football';end if;
 if action='list' then
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',doc->>'name','pending',not (x->>'approved')::boolean)),'[]'::jsonb) into result from public.tl_football_leagues cross join lateral jsonb_array_elements(doc->'members') x where x->>'user_id'=u::text;
  return jsonb_build_object('leagues',result);
 end if;
 if action='create' then
  if length(trim(coalesce(payload->>'name',''))) not between 1 and 60 or length(trim(coalesce(payload->>'name_player',''))) not between 1 and 40 then raise exception 'Enter a league and player name';end if;
  deadline:=(payload->>'deadline')::timestamptz;
  if deadline is null or deadline<=now() then raise exception 'Choose a future deadline';end if;
  if (select count(*) from public.tl_football_leagues where owner_id=u)>=10 then raise exception 'League limit reached';end if;
  d:=jsonb_build_object('name',trim(payload->>'name'),'theme','gold','round',1,'deadline',deadline,'status','playing','source','Organiser-entered scores — not live','members',jsonb_build_array(jsonb_build_object('user_id',u,'name',trim(payload->>'name_player'),'role','owner','approved',true,'active',true)),'fixtures','[]'::jsonb,'picks','[]'::jsonb,'messages','[]'::jsonb,'history','[]'::jsonb,'events','[]'::jsonb,'visibility','private','rollover','end','prize','Matchday bragging rights');
  insert into public.tl_football_leagues(owner_id,doc) values(u,d) returning * into l;
 elsif action='join' then
  select * into l from public.tl_football_leagues where invite=(payload->>'code')::uuid for update;
  if l.id is null then raise exception 'Invitation not found';end if;
  if length(trim(coalesce(payload->>'name',''))) not between 1 and 40 then raise exception 'Enter your display name';end if;
  if not exists(select 1 from jsonb_array_elements(l.doc->'members') x where x->>'user_id'=u::text) then
   if jsonb_array_length(l.doc->'members')>=500 then raise exception 'This league is full';end if;
   l.doc:=jsonb_set(l.doc,'{members}',(l.doc->'members')||jsonb_build_array(jsonb_build_object('user_id',u,'name',trim(payload->>'name'),'role','player','approved',false,'active',true)));
   l.doc:=jsonb_set(l.doc,'{events}',coalesce(l.doc->'events','[]'::jsonb)||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'at',now(),'target',l.owner_id,'text','A player has requested to join your league')));
   update public.tl_football_leagues set doc=l.doc where id=l.id;
  end if;
 else
  if nullif(payload->>'id','') is null then
   select * into l from public.tl_football_leagues where exists(select 1 from jsonb_array_elements(doc->'members') x where x->>'user_id'=u::text) order by created_at desc limit 1 for update;
   if l.id is null then return jsonb_build_object('league',null);end if;
  else select * into l from public.tl_football_leagues where id=(payload->>'id')::uuid for update;end if;
 end if;
 if l.id is null then raise exception 'League not found';end if;
 d:=l.doc;if not d ? 'events' then d:=d||'{"events":[]}'::jsonb;end if;
 select value into m from jsonb_array_elements(d->'members') where value->>'user_id'=u::text;
 if m is null then raise exception 'League access denied';end if;
 if not (m->>'approved')::boolean then return jsonb_build_object('league',null,'pending',true);end if;
 own:=l.owner_id=u; staff:=own or m->>'role'='staff';deadline:=(d->>'deadline')::timestamptz;
 if action not in ('get','create','join','pick','message','remove-message','fixture','result','settle','next','settings','approve','role') then raise exception 'Unknown football action';end if;
 if action in ('fixture','settle','next','settings','approve','role') and not own then raise exception 'Owner access required';end if;
 if action in ('result','remove-message') and not staff then raise exception 'Staff access required';end if;
 if action='pick' then
  team:=payload->>'team';
  if now()>=deadline or d->>'status'<>'playing' or exists(select 1 from jsonb_array_elements(d->'fixtures') x where x->>'kickoff' is not null and (x->>'kickoff')::timestamptz<=now()) then raise exception 'Picks are locked';end if;
  if not (m->>'active')::boolean then raise exception 'You are out';end if;
  if not exists(select 1 from jsonb_array_elements(d->'fixtures') x where x->>'home'=team or x->>'away'=team) then raise exception 'Choose a team in this round';end if;
  if exists(select 1 from jsonb_array_elements(d->'history') h cross join lateral jsonb_array_elements(h->'picks') x where x->>'user_id'=u::text and x->>'team'=team) then raise exception 'Team already used';end if;
  select coalesce(jsonb_agg(x),'[]') into ps from jsonb_array_elements(d->'picks') x where x->>'user_id'<>u::text;
  d:=jsonb_set(d,'{picks}',ps||jsonb_build_array(jsonb_build_object('user_id',u,'team',team)));
 elsif action='message' then
  if length(trim(coalesce(payload->>'text',''))) not between 1 and 450 then raise exception 'Messages must contain 1–450 characters';end if;
  if exists(select 1 from jsonb_array_elements(d->'messages') x where x->>'user_id'=u::text and (x->>'at')::timestamptz>now()-interval '3 seconds') then raise exception 'Please wait before posting again';end if;
  select coalesce(jsonb_agg(x order by x->>'at'),'[]') into ps from (select x from jsonb_array_elements(d->'messages') x order by x->>'at' desc limit 199) q;
  d:=jsonb_set(d,'{messages}',ps||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'user_id',u,'name',m->>'name','text',trim(payload->>'text')||coalesce((select ' @['||(x->>'name')||']' from jsonb_array_elements(d->'members') x where x->>'user_id'=payload->>'mention' and (x->>'approved')::boolean),''),'at',now())));
 elsif action='remove-message' then
  select coalesce(jsonb_agg(x),'[]') into ps from jsonb_array_elements(d->'messages') x where x->>'id'<>payload->>'message';d:=jsonb_set(d,'{messages}',ps);
 elsif action='settings' then
  if length(trim(coalesce(payload->>'name',''))) not between 1 and 60 or coalesce(payload->>'theme','') not in ('gold','blue','green','red','purple','silver') then raise exception 'Invalid league settings';end if;

  if coalesce(payload->>'visibility',d->>'visibility','private') not in ('private','public') or coalesce(payload->>'rollover',d->>'rollover','end') not in ('end','replay') then raise exception 'Invalid league settings';end if;
  if coalesce(payload->>'rollover',d->>'rollover','end')<>coalesce(d->>'rollover','end') and ((d->>'round')::int>1 or jsonb_array_length(d->'picks')>0 or now()>=deadline) then raise exception 'Rollover rules are fixed once picks begin';end if;
  if length(coalesce(payload->>'prize',''))>160 then raise exception 'Prize description too long';end if;
  if payload ? 'slug' then
   if coalesce(payload->>'slug','') !~ '^[a-z0-9][a-z0-9-]{2,49}$' then raise exception 'Use 3–50 lower-case letters, numbers or hyphens';end if;
   l.slug:=payload->>'slug';
  end if;
  if payload ? 'logo' and payload->>'logo'<>'' then
   if length(payload->>'logo')>180000 or payload->>'logo' !~ '^data:image/png;base64,[a-zA-Z0-9+/=]+$' then raise exception 'Invalid PNG logo';end if;
   if encode(substring(decode(split_part(payload->>'logo',',',2),'base64') from 1 for 8),'hex')<>'89504e470d0a1a0a' then raise exception 'Invalid PNG image';end if;
  end if;
  d:=d||jsonb_build_object('name',trim(payload->>'name'),'theme',payload->>'theme','visibility',coalesce(payload->>'visibility',d->>'visibility','private'),'rollover',coalesce(payload->>'rollover',d->>'rollover','end'),'prize',coalesce(payload->>'prize',d->>'prize',''),'logo',coalesce(payload->>'logo',d->>'logo',''));

 elsif action in ('approve','role') then
  target:=payload->>'member';
  if target=l.owner_id::text then raise exception 'Owner role is fixed';end if;
  if action='role' and coalesce(payload->>'role','') not in ('player','staff') then raise exception 'Invalid role';end if;
  if action='approve' and (d->>'round')::int<>1 then raise exception 'New players can only enter before the first deadline';end if;
  if action='approve' and now()>=deadline then raise exception 'Player entry closed';end if;
  select jsonb_agg(case when x->>'user_id'=target then case when action='approve' then x||'{"approved":true}'::jsonb else x||jsonb_build_object('role',payload->>'role') end else x end) into ms from jsonb_array_elements(d->'members') x;d:=jsonb_set(d,'{members}',ms);
 elsif action='fixture' then
  if coalesce(d->'feed','null'::jsonb)<>'null'::jsonb then raise exception 'Provider fixtures cannot be edited manually';end if;
  if now()>=deadline or d->>'status'<>'playing' then raise exception 'Fixtures locked';end if;
  if length(trim(coalesce(payload->>'home',''))) not between 1 and 60 or length(trim(coalesce(payload->>'away',''))) not between 1 and 60 or lower(trim(payload->>'home'))=lower(trim(payload->>'away')) then raise exception 'Enter two different teams';end if;
  if exists(select 1 from jsonb_array_elements(d->'fixtures') x where lower(x->>'home') in (lower(trim(payload->>'home')),lower(trim(payload->>'away'))) or lower(x->>'away') in (lower(trim(payload->>'home')),lower(trim(payload->>'away')))) then raise exception 'A team already has a fixture this round';end if;
  if payload->>'kickoff' is not null and ((payload->>'kickoff')::timestamptz<deadline or (payload->>'kickoff')::timestamptz<=now()) then raise exception 'Kickoff must be after the pick deadline';end if;
  if jsonb_array_length(d->'fixtures')>=30 then raise exception 'Fixture limit reached';end if;
  d:=jsonb_set(d,'{fixtures}',(d->'fixtures')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'home',trim(payload->>'home'),'away',trim(payload->>'away'),'status','NS','home_score',null,'away_score',null,'kickoff',payload->>'kickoff')));
 elsif action='result' then
  if coalesce(d->'feed','null'::jsonb)<>'null'::jsonb then raise exception 'Provider scores cannot be edited manually';end if;
  if d->>'status'<>'playing' then raise exception 'Round is already settled';end if;
  if coalesce(payload->>'status','') not in ('NS','LIVE','FT','POSTPONED') then raise exception 'Invalid match status';end if;
  if payload->>'status'='FT' and (payload->>'home_score' is null or payload->>'away_score' is null) then raise exception 'Final scores required';end if;
  if (payload->>'home_score')::numeric not between 0 and 99 or (payload->>'away_score')::numeric not between 0 and 99 or (payload->>'home_score')::numeric<>trunc((payload->>'home_score')::numeric) or (payload->>'away_score')::numeric<>trunc((payload->>'away_score')::numeric) then raise exception 'Scores must be integers from 0 to 99';end if;
  if not exists(select 1 from jsonb_array_elements(d->'fixtures') x where x->>'id'=payload->>'fixture') then raise exception 'Fixture not found';end if;
  select jsonb_agg(case when x->>'id'=payload->>'fixture' then x||jsonb_build_object('status',payload->>'status','home_score',payload->'home_score','away_score',payload->'away_score') else x end) into fs from jsonb_array_elements(d->'fixtures') x;d:=jsonb_set(d,'{fixtures}',fs);
 elsif action='settle' then
  d:=public.tl_football_settled(d);
 elsif action='next' then
  if d->>'status'<>'round-complete' then raise exception 'Settle this round first';end if;
  deadline:=(payload->>'deadline')::timestamptz;if deadline is null or deadline<=now() then raise exception 'Choose a future deadline';end if;
  d:=d||jsonb_build_object('round',(d->>'round')::int+1,'deadline',deadline,'status','playing','rolled_over',false,'feed',null,'synced_at',null,'source','Organiser-entered scores — not live','history',(d->'history')||jsonb_build_array(jsonb_build_object('round',d->'round','picks',d->'picks','fixtures',d->'fixtures','members',d->'members','rolled_over',coalesce(d->'rolled_over','false'::jsonb))),'picks','[]'::jsonb,'fixtures','[]'::jsonb);
 end if;

 if d<>l.doc or l.slug is distinct from (select slug from public.tl_football_leagues where id=l.id) then
  select coalesce(jsonb_agg(x order by x->>'at'),'[]') into ps from (select x from jsonb_array_elements(d->'events') x order by x->>'at' desc limit 99) q;
  target:=case when action='pick' then u::text when action='approve' then payload->>'member' when action='message' then nullif(payload->>'mention','') else null end;
  d:=jsonb_set(d,'{events}',ps||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'at',now(),'target',target,'text',case action when 'message' then case when target is not null then 'You were mentioned in the banter wall' else 'New banter message' end when 'approve' then 'Your league request was approved' when 'settle' then 'The round has been settled' when 'next' then 'A new round is open' when 'result' then 'A match score was updated' when 'pick' then 'Your pick was saved' else 'League settings updated' end)));
  update public.tl_football_leagues set doc=d,slug=l.slug where id=l.id;
 end if;
 select coalesce(jsonb_agg(x),'[]') into ps from jsonb_array_elements(d->'events') x where x->>'target' is null or x->>'target'=u::text;d:=jsonb_set(d,'{events}',ps);

 -- Never send opponents' picks to the browser before the server deadline.
 if now()<(d->>'deadline')::timestamptz then select coalesce(jsonb_agg(x),'[]') into ps from jsonb_array_elements(d->'picks') x where x->>'user_id'=u::text;d:=jsonb_set(d,'{picks}',ps);end if;
 if not own then select coalesce(jsonb_agg(x),'[]') into ms from jsonb_array_elements(d->'members') x where (x->>'approved')::boolean;d:=jsonb_set(d,'{members}',ms);end if;
 return jsonb_build_object('league',d||jsonb_build_object('id',l.id,'invite',l.invite,'slug',l.slug));
end;$$;
revoke all on function public.tl_football(text,jsonb) from public,anon;
grant execute on function public.tl_football(text,jsonb) to authenticated;
-- Append to consolidated installer; server-only cache and AI quota state.
create table if not exists public.tl_football_cache(
 key text primary key,payload jsonb,fetched_at timestamptz,lease_until timestamptz
);
create table if not exists public.tl_football_ai(
 league_id uuid not null references public.tl_football_leagues(id),round int not null,user_id uuid not null references auth.users(id),
 state text not null check(state in ('pending','done','failed')),reply jsonb,attempts int not null default 1,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(league_id,round,user_id)
);
alter table public.tl_football_cache enable row level security;
alter table public.tl_football_ai enable row level security;
revoke all on public.tl_football_cache,public.tl_football_ai from anon,authenticated;
create index if not exists tl_football_ai_daily on public.tl_football_ai(created_at,user_id);

create or replace function public.tl_football_public(p_slug text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.tl_football_leagues;d jsonb;ms jsonb;ps jsonb;hs jsonb;
begin
 select * into l from public.tl_football_leagues where slug=p_slug and doc->>'visibility'='public';
 if l.id is null then return null;end if;d:=l.doc;
 select coalesce(jsonb_agg(jsonb_build_object('user_id','player-'||n,'name',x->>'name','active',x->'active','role','player','approved',true)),'[]') into ms from jsonb_array_elements(d->'members') with ordinality a(x,n) where (x->>'approved')::boolean;
 -- Public identifiers are ephemeral ordinals, never auth user IDs.
 select coalesce(jsonb_agg(jsonb_build_object('user_id','player-'||n,'team',p->>'team')),'[]') into ps from jsonb_array_elements(d->'members') with ordinality a(x,n) cross join lateral jsonb_array_elements(d->'picks') p where p->>'user_id'=x->>'user_id' and now()>=(d->>'deadline')::timestamptz and (x->>'approved')::boolean;
 select coalesce(jsonb_agg(jsonb_build_object('round',h->'round','rolled_over',h->'rolled_over','fixtures',h->'fixtures',
 'picks',(select coalesce(jsonb_agg(jsonb_build_object('user_id','player-'||n,'team',p->>'team')),'[]') from jsonb_array_elements(d->'members') with ordinality a(x,n) cross join lateral jsonb_array_elements(coalesce(h->'picks','[]'::jsonb)) p where p->>'user_id'=x->>'user_id' and (x->>'approved')::boolean),
 'members',(select coalesce(jsonb_agg(jsonb_build_object('user_id','player-'||n,'active',hm->'active')),'[]') from jsonb_array_elements(d->'members') with ordinality a(x,n) cross join lateral jsonb_array_elements(coalesce(h->'members','[]'::jsonb)) hm where hm->>'user_id'=x->>'user_id' and (x->>'approved')::boolean)
 )),'[]') into hs from jsonb_array_elements(d->'history') h;
 return jsonb_build_object('name',d->>'name','theme',d->>'theme','logo',d->>'logo','slug',l.slug,'visibility','public','prize',d->>'prize','round',d->'round','deadline',d->>'deadline','status',d->>'status','source',d->>'source','synced_at',d->>'synced_at','feed',d->'feed','members',ms,'picks',ps,'fixtures',d->'fixtures','history',hs,'messages','[]'::jsonb,'events','[]'::jsonb,'winner_name',(select x->>'name' from jsonb_array_elements(d->'members') x where x->>'user_id'=d->>'winner' and (x->>'approved')::boolean),'public_view',true);
end;$$;
revoke all on function public.tl_football_public(text) from public;
grant execute on function public.tl_football_public(text) to anon,authenticated;

create or replace function public.tl_football_cache_claim(p_key text,p_ttl int)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare c public.tl_football_cache;
begin
 if length(p_key)>120 or p_ttl<30 or p_ttl>86400 then raise exception 'Invalid cache key';end if;
 insert into public.tl_football_cache(key) values(p_key) on conflict do nothing;
 select * into c from public.tl_football_cache where key=p_key for update;
 if c.payload is not null and c.fetched_at>now()-make_interval(secs=>p_ttl) then return jsonb_build_object('hit',true,'payload',c.payload,'fetched_at',c.fetched_at,'stale',false);end if;
 if c.lease_until>now() then return jsonb_build_object('hit',true,'payload',c.payload,'fetched_at',c.fetched_at,'stale',true);end if;
 update public.tl_football_cache set lease_until=now()+interval '40 seconds' where key=p_key;
 return jsonb_build_object('hit',false);
end;$$;
revoke all on function public.tl_football_cache_claim(text,int) from public,anon,authenticated;
grant execute on function public.tl_football_cache_claim(text,int) to service_role;

create or replace function public.tl_football_service(action text,payload jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare l public.tl_football_leagues;d jsonb;fs jsonb;f jsonb;old jsonb;m jsonb;ps jsonb;v jsonb;ai public.tl_football_ai;uid uuid;ready boolean;first_time boolean;earliest timestamptz;r int;
begin
 if action='active' then
  select coalesce(jsonb_agg(doc||jsonb_build_object('id',id)),'[]'::jsonb) into ps from (select id,doc from public.tl_football_leagues where doc->>'status'='playing' and coalesce(doc->'feed','null'::jsonb)<>'null'::jsonb order by (doc->>'synced_at')::timestamptz asc nulls first,created_at limit 50) q;
  return jsonb_build_object('leagues',ps);
 elsif action='provider-allow' then
  perform pg_advisory_xact_lock(798302142);
  insert into public.tl_football_cache(key,payload,fetched_at) values('provider-minute',jsonb_build_object('count',0),date_trunc('minute',now())) on conflict do nothing;
  select c.payload into ps from public.tl_football_cache c where key='provider-minute' and fetched_at=date_trunc('minute',now());
  if ps is null then ps:='{"count":0}'::jsonb;end if;
  if (ps->>'count')::int>=8 then raise exception 'Football provider request budget reached; please wait a minute';end if;
  update public.tl_football_cache set payload=jsonb_build_object('count',(ps->>'count')::int+1),fetched_at=date_trunc('minute',now()) where key='provider-minute';return '{"ok":true}';
 elsif action='cache-put' then
  update public.tl_football_cache set payload=tl_football_service.payload->'data',fetched_at=now(),lease_until=null where key=tl_football_service.payload->>'key';return '{"ok":true}';
 elsif action='cache-release' then
  update public.tl_football_cache set lease_until=null where key=tl_football_service.payload->>'key';return '{"ok":true}';
 end if;
 select * into l from public.tl_football_leagues where id=(payload->>'id')::uuid for update;
 if l.id is null then raise exception 'League not found';end if;d:=l.doc;r:=(d->>'round')::int;
 if action='get' then return d||jsonb_build_object('id',l.id);end if;
 if action='sync' then
  if d->>'status'<>'playing' then return jsonb_build_object('ok',true);end if;
  if payload->>'round' is null or (payload->>'round')::int<>r then raise exception 'The league round changed';end if;
  fs:=payload->'fixtures';
  if jsonb_typeof(fs)<>'array' or jsonb_array_length(fs) not between 1 and 30 then raise exception 'Invalid provider fixtures';end if;
  if exists(select 1 from jsonb_array_elements(fs) x where length(x->>'home') not between 1 and 60 or length(x->>'away') not between 1 and 60 or x->>'home'=x->>'away' or x->>'id' !~ '^[0-9]+$' or x->>'status' not in ('NS','LIVE','HT','FT','POSTPONED','SUSPENDED','CANCELLED','AWARDED') or x->>'kickoff' is null) then raise exception 'Invalid provider match';end if;
  if (select count(distinct x->>'id') from jsonb_array_elements(fs) x)<>jsonb_array_length(fs) then raise exception 'Duplicate provider fixture';end if;
  if exists(select 1 from jsonb_array_elements(fs) x where x->>'status'='FT' and (x->>'home_score' is null or x->>'away_score' is null)) then raise exception 'Missing final score';end if;
  first_time:=d->'feed' is null or d->'feed'='null'::jsonb;
  if first_time then
   if jsonb_array_length(d->'picks')>0 or jsonb_array_length(d->'fixtures')>0 then raise exception 'Start a new empty round before importing fixtures';end if;
   select min((x->>'kickoff')::timestamptz) into earliest from jsonb_array_elements(fs) x;
   if earliest<=now() then raise exception 'Choose a round that has not started';end if;
   if earliest<(d->>'deadline')::timestamptz then d:=jsonb_set(d,'{deadline}',to_jsonb(earliest));end if;
  else
   if payload->'feed'<>d->'feed' then raise exception 'The competition and matchday are fixed for this round';end if;
   if exists(select 1 from jsonb_array_elements(d->'fixtures') a full join jsonb_array_elements(fs) b on a->>'id'=b->>'id' where a is null or b is null or a->>'home'<>b->>'home' or a->>'away'<>b->>'away') then raise exception 'The provider changed the fixture list; organiser review required';end if;
  end if;
  d:=d||jsonb_build_object('fixtures',fs,'feed',payload->'feed','synced_at',payload->>'fetched_at','source','football-data.org · provider coverage and delay apply');
  -- Only settle when every remaining player's picked match is final.
  ready:=now()>=(d->>'deadline')::timestamptz and exists(select 1 from jsonb_array_elements(d->'members') x where (x->>'active')::boolean and (x->>'approved')::boolean);
  if ready then
   for m in select value from jsonb_array_elements(d->'members') where (value->>'active')::boolean and (value->>'approved')::boolean loop
    select value into v from jsonb_array_elements(d->'picks') where value->>'user_id'=m->>'user_id';
    if v is not null and not exists(select 1 from jsonb_array_elements(fs) x where (x->>'home'=v->>'team' or x->>'away'=v->>'team') and x->>'status'='FT') then ready:=false;end if;
   end loop;
  end if;
  if ready then d:=public.tl_football_settled(d);d:=jsonb_set(d,'{events}',coalesce(d->'events','[]'::jsonb)||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'at',now(),'text','Round settled from provider final scores','target',null)));end if;
  update public.tl_football_leagues set doc=d where id=l.id;
  return jsonb_build_object('ok',true,'settled',ready);
 elsif action='ai-start' then
  uid:=(payload->>'user')::uuid;
  select value into m from jsonb_array_elements(d->'members') where value->>'user_id'=uid::text and (value->>'approved')::boolean;
  if m is null then raise exception 'League access denied';end if;
  select * into ai from public.tl_football_ai where league_id=l.id and round=r and user_id=uid for update;
  if ai.state='done' then return jsonb_build_object('cached',true,'reply',ai.reply);end if;
  if ai.state='pending' and ai.updated_at>now()-interval '60 seconds' then raise exception 'The Gaffer is already preparing your verdict';end if;
  if not (m->>'active')::boolean or d->>'status'<>'playing' or now()>=(d->>'deadline')::timestamptz then raise exception 'Advice is only available to remaining players before the deadline';end if;
  if ai.attempts>=2 then raise exception 'The Gaffer could not complete this round; please choose your own team';end if;
  perform pg_advisory_xact_lock(798302141);
  if (select coalesce(sum(attempts),0) from public.tl_football_ai where created_at>=date_trunc('day',now()) and user_id=uid)>=5 or (select coalesce(sum(attempts),0) from public.tl_football_ai where created_at>=date_trunc('day',now()))>=100 then raise exception 'Daily AI limit reached';end if;
  insert into public.tl_football_ai(league_id,round,user_id,state) values(l.id,r,uid,'pending') on conflict(league_id,round,user_id) do update set state='pending',attempts=tl_football_ai.attempts+1,updated_at=now();
  return jsonb_build_object('cached',false,'round',r);
 elsif action in ('ai-complete','ai-fail') then
  update public.tl_football_ai set state=case when action='ai-complete' then 'done' else 'failed' end,reply=case when action='ai-complete' then payload->'reply' else null end,updated_at=now() where league_id=l.id and round=(payload->>'round')::int and user_id=(payload->>'user')::uuid and state='pending';
  return '{"ok":true}';
 end if;
 raise exception 'Invalid service action';
end;$$;
revoke all on function public.tl_football_service(text,jsonb) from public,anon,authenticated;
grant execute on function public.tl_football_service(text,jsonb) to service_role;

commit;
