begin;
create table if not exists public.tl_arcade_matches(
 id uuid primary key default gen_random_uuid(),kind text not null,
 host uuid not null references auth.users(id),guest uuid references auth.users(id),
 status text not null default 'waiting' check(status in ('waiting','playing','finished')),
 version integer not null default 0,state jsonb not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.tl_arcade_matches enable row level security;
revoke all on public.tl_arcade_matches from public,anon,authenticated;
grant select,insert,update,delete on public.tl_arcade_matches to service_role;
create index if not exists tl_arcade_matches_host on public.tl_arcade_matches(host,created_at desc);
create index if not exists tl_arcade_matches_guest on public.tl_arcade_matches(guest,created_at desc);
create or replace function public.tl_arcade_service(action text,p_actor uuid,payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare m public.tl_arcade_matches%rowtype;gid uuid;
begin
 if p_actor is null or not exists(select 1 from auth.users where id=p_actor) then raise exception 'Sign in first';end if;
 if action='list' then return jsonb_build_object('matches',coalesce((select jsonb_agg(jsonb_build_object('id',t.id,'kind',t.kind,'status',t.status,'version',t.version,'updated_at',t.updated_at)) from(select * from public.tl_arcade_matches where host=p_actor or guest=p_actor order by updated_at desc limit 30)t),'[]'::jsonb));end if;
 if action='create' then
  if coalesce(payload->>'kind','') not in ('noughts','connect','reversi','battleships','darts301','darts501','pool','snooker') then raise exception 'Unsupported game';end if;
  if (select count(*) from public.tl_arcade_matches where host=p_actor and created_at>now()-interval '1 hour')>=10 then raise exception 'Please wait before creating more matches';end if;
  if jsonb_typeof(payload->'state') is distinct from 'object' or octet_length((payload->'state')::text)>50000 then raise exception 'Invalid state';end if;
  insert into public.tl_arcade_matches(kind,host,state) values(payload->>'kind',p_actor,payload->'state') returning * into m;
 else
  gid:=(payload->>'id')::uuid;
  select * into m from public.tl_arcade_matches where id=gid for update;
  if not found then raise exception 'Match unavailable';end if;
  if action='join' and m.host<>p_actor and m.guest is null and m.status='waiting' then
   update public.tl_arcade_matches set guest=p_actor,status='playing',version=version+1,updated_at=now() where id=gid returning * into m;
  end if;
  if p_actor is distinct from m.host and p_actor is distinct from m.guest then raise exception 'Not a participant';end if;
  if action='commit' then
   if m.status<>'playing' then raise exception 'Match is not playing';end if;
   if m.version is distinct from (payload->>'version')::int then raise exception 'Outdated match state';end if;
   if p_actor is distinct from (case (m.state->>'turn')::int when 0 then m.host else m.guest end) then raise exception 'Not your turn';end if;
   if jsonb_typeof(payload->'state') is distinct from 'object' or octet_length((payload->'state')::text)>50000 then raise exception 'Invalid state';end if;
   update public.tl_arcade_matches set state=payload->'state',version=version+1,status=case when (payload#>>'{state,finished}')::boolean then 'finished' else 'playing' end,updated_at=now() where id=gid returning * into m;
  elsif action not in ('get','join') then raise exception 'Unknown game action';end if;
 end if;
 return jsonb_build_object('match',to_jsonb(m));
end $$;
revoke all on function public.tl_arcade_service(text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.tl_arcade_service(text,uuid,jsonb) to service_role;
commit;
