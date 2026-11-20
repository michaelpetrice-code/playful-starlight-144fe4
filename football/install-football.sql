-- Additive migration. Does not touch the existing football prediction records.
begin;
create table if not exists public.tl_football_leagues (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id),
 invite uuid not null unique default gen_random_uuid(),
 doc jsonb not null,
 created_at timestamptz not null default now()
);
alter table public.tl_football_leagues enable row level security;
revoke all on public.tl_football_leagues from anon,authenticated;
-- All access is via this locked RPC, with membership and action checks.
create or replace function public.tl_football(action text,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
 u uuid:=auth.uid(); l public.tl_football_leagues; d jsonb; m jsonb; f jsonb; p jsonb; v jsonb;
 ms jsonb; ps jsonb; fs jsonb; hs jsonb; result jsonb; target text; team text; deadline timestamptz;
 own boolean; staff boolean; active boolean; won boolean; survivors int:=0; winner text; n int;
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
  d:=jsonb_build_object('name',trim(payload->>'name'),'theme','gold','round',1,'deadline',deadline,'status','playing','source','Organiser-entered scores — not live','members',jsonb_build_array(jsonb_build_object('user_id',u,'name',trim(payload->>'name_player'),'role','owner','approved',true,'active',true)),'fixtures','[]'::jsonb,'picks','[]'::jsonb,'messages','[]'::jsonb,'history','[]'::jsonb);
  insert into public.tl_football_leagues(owner_id,doc) values(u,d) returning * into l;
 elsif action='join' then
  select * into l from public.tl_football_leagues where invite=(payload->>'code')::uuid for update;
  if l.id is null then raise exception 'Invitation not found';end if;
  if length(trim(coalesce(payload->>'name',''))) not between 1 and 40 then raise exception 'Enter your display name';end if;
  if not exists(select 1 from jsonb_array_elements(l.doc->'members') x where x->>'user_id'=u::text) then
   if jsonb_array_length(l.doc->'members')>=500 then raise exception 'This league is full';end if;
   l.doc:=jsonb_set(l.doc,'{members}',(l.doc->'members')||jsonb_build_array(jsonb_build_object('user_id',u,'name',trim(payload->>'name'),'role','player','approved',false,'active',true)));
   update public.tl_football_leagues set doc=l.doc where id=l.id;
  end if;
 else
  if nullif(payload->>'id','') is null then
   select * into l from public.tl_football_leagues where exists(select 1 from jsonb_array_elements(doc->'members') x where x->>'user_id'=u::text) order by created_at desc limit 1 for update;
   if l.id is null then return jsonb_build_object('league',null);end if;
  else select * into l from public.tl_football_leagues where id=(payload->>'id')::uuid for update;end if;
 end if;
 if l.id is null then raise exception 'League not found';end if;
 d:=l.doc;
 select value into m from jsonb_array_elements(d->'members') where value->>'user_id'=u::text;
 if m is null then raise exception 'League access denied';end if;
 if not (m->>'approved')::boolean then return jsonb_build_object('league',null,'pending',true);end if;
 own:=l.owner_id=u; staff:=own or m->>'role'='staff';deadline:=(d->>'deadline')::timestamptz;
 if action not in ('get','create','join','pick','message','remove-message','fixture','result','settle','next','settings','approve','role') then raise exception 'Unknown football action';end if;
 if action in ('fixture','settle','next','settings','approve','role') and not own then raise exception 'Owner access required';end if;
 if action in ('result','remove-message') and not staff then raise exception 'Staff access required';end if;
 if action='pick' then
  team:=payload->>'team';
  if now()>=deadline or d->>'status'<>'playing' then raise exception 'Picks are locked';end if;
  if not (m->>'active')::boolean then raise exception 'You are out';end if;
  if not exists(select 1 from jsonb_array_elements(d->'fixtures') x where x->>'home'=team or x->>'away'=team) then raise exception 'Choose a team in this round';end if;
  if exists(select 1 from jsonb_array_elements(d->'history') h cross join lateral jsonb_array_elements(h->'picks') x where x->>'user_id'=u::text and x->>'team'=team) then raise exception 'Team already used';end if;
  select coalesce(jsonb_agg(x),'[]') into ps from jsonb_array_elements(d->'picks') x where x->>'user_id'<>u::text;
  d:=jsonb_set(d,'{picks}',ps||jsonb_build_array(jsonb_build_object('user_id',u,'team',team)));
 elsif action='message' then
  if length(trim(coalesce(payload->>'text',''))) not between 1 and 500 then raise exception 'Messages must contain 1–500 characters';end if;
  if exists(select 1 from jsonb_array_elements(d->'messages') x where x->>'user_id'=u::text and (x->>'at')::timestamptz>now()-interval '3 seconds') then raise exception 'Please wait before posting again';end if;
  select coalesce(jsonb_agg(x order by x->>'at'),'[]') into ps from (select x from jsonb_array_elements(d->'messages') x order by x->>'at' desc limit 199) q;
  d:=jsonb_set(d,'{messages}',ps||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'user_id',u,'name',m->>'name','text',trim(payload->>'text'),'at',now())));
 elsif action='remove-message' then
  select coalesce(jsonb_agg(x),'[]') into ps from jsonb_array_elements(d->'messages') x where x->>'id'<>payload->>'message';d:=jsonb_set(d,'{messages}',ps);
 elsif action='settings' then
  if length(trim(coalesce(payload->>'name',''))) not between 1 and 60 or coalesce(payload->>'theme','') not in ('gold','blue','green','red','purple','silver') then raise exception 'Invalid league settings';end if;
  d:=d||jsonb_build_object('name',trim(payload->>'name'),'theme',payload->>'theme');
 elsif action in ('approve','role') then
  target:=payload->>'member';
  if target=l.owner_id::text then raise exception 'Owner role is fixed';end if;
  if action='role' and coalesce(payload->>'role','') not in ('player','staff') then raise exception 'Invalid role';end if;
  if action='approve' and (d->>'round')::int<>1 then raise exception 'New players can only enter before the first deadline';end if;
  if action='approve' and now()>=deadline then raise exception 'Player entry closed';end if;
  select jsonb_agg(case when x->>'user_id'=target then case when action='approve' then x||'{"approved":true}'::jsonb else x||jsonb_build_object('role',payload->>'role') end else x end) into ms from jsonb_array_elements(d->'members') x;d:=jsonb_set(d,'{members}',ms);
 elsif action='fixture' then
  if now()>=deadline or d->>'status'<>'playing' then raise exception 'Fixtures locked';end if;
  if length(trim(coalesce(payload->>'home',''))) not between 1 and 60 or length(trim(coalesce(payload->>'away',''))) not between 1 and 60 or lower(trim(payload->>'home'))=lower(trim(payload->>'away')) then raise exception 'Enter two different teams';end if;
  if exists(select 1 from jsonb_array_elements(d->'fixtures') x where lower(x->>'home') in (lower(trim(payload->>'home')),lower(trim(payload->>'away'))) or lower(x->>'away') in (lower(trim(payload->>'home')),lower(trim(payload->>'away')))) then raise exception 'A team already has a fixture this round';end if;
  if jsonb_array_length(d->'fixtures')>=30 then raise exception 'Fixture limit reached';end if;
  d:=jsonb_set(d,'{fixtures}',(d->'fixtures')||jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'home',trim(payload->>'home'),'away',trim(payload->>'away'),'status','NS','home_score',null,'away_score',null)));
 elsif action='result' then
  if d->>'status'<>'playing' then raise exception 'Round is already settled';end if;
  if coalesce(payload->>'status','') not in ('NS','LIVE','FT','POSTPONED') then raise exception 'Invalid match status';end if;
  if payload->>'status'='FT' and (payload->>'home_score' is null or payload->>'away_score' is null) then raise exception 'Final scores required';end if;
  if (payload->>'home_score')::numeric not between 0 and 99 or (payload->>'away_score')::numeric not between 0 and 99 or (payload->>'home_score')::numeric<>trunc((payload->>'home_score')::numeric) or (payload->>'away_score')::numeric<>trunc((payload->>'away_score')::numeric) then raise exception 'Scores must be integers from 0 to 99';end if;
  if not exists(select 1 from jsonb_array_elements(d->'fixtures') x where x->>'id'=payload->>'fixture') then raise exception 'Fixture not found';end if;
  select jsonb_agg(case when x->>'id'=payload->>'fixture' then x||jsonb_build_object('status',payload->>'status','home_score',payload->'home_score','away_score',payload->'away_score') else x end) into fs from jsonb_array_elements(d->'fixtures') x;d:=jsonb_set(d,'{fixtures}',fs);
 elsif action='settle' then
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
  d:=d||jsonb_build_object('members',ms,'status',case when survivors=0 then 'all-out' when survivors=1 then 'complete' else 'round-complete' end,'winner',case when survivors=1 then winner else null end);
 elsif action='next' then
  if d->>'status'<>'round-complete' then raise exception 'Settle this round first';end if;
  deadline:=(payload->>'deadline')::timestamptz;if deadline is null or deadline<=now() then raise exception 'Choose a future deadline';end if;
  d:=d||jsonb_build_object('round',(d->>'round')::int+1,'deadline',deadline,'status','playing','history',(d->'history')||jsonb_build_array(jsonb_build_object('round',d->'round','picks',d->'picks','fixtures',d->'fixtures')),'picks','[]'::jsonb,'fixtures','[]'::jsonb);
 end if;
 if d<>l.doc then update public.tl_football_leagues set doc=d where id=l.id;end if;
 -- Never send opponents' picks to the browser before the server deadline.
 if now()<(d->>'deadline')::timestamptz then select coalesce(jsonb_agg(x),'[]') into ps from jsonb_array_elements(d->'picks') x where x->>'user_id'=u::text;d:=jsonb_set(d,'{picks}',ps);end if;
 if not own then select coalesce(jsonb_agg(x),'[]') into ms from jsonb_array_elements(d->'members') x where (x->>'approved')::boolean;d:=jsonb_set(d,'{members}',ms);end if;
 return jsonb_build_object('league',d||jsonb_build_object('id',l.id,'invite',l.invite));
end;$$;
revoke all on function public.tl_football(text,jsonb) from public,anon;
grant execute on function public.tl_football(text,jsonb) to authenticated;
commit;
