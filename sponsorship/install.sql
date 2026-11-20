begin;
create table public.local_sponsor_placements (
 id uuid primary key default gen_random_uuid(),
 business text not null check(length(business) between 1 and 100),
 message text not null default '' check(length(message)<=240),
 website text not null default '' check(website='' or website ~ '^https://[a-zA-Z0-9.-]+(:[0-9]{1,5})?([/?#][^[:space:]]*)?$'),
 plan text not null check(plan in ('community','section','main','featured')),
 section text not null default 'partners' check(section in ('partners','football','games','home','trades')),
 starts_at timestamptz not null, ends_at timestamptz not null check(ends_at>starts_at),
 status text not null default 'draft' check(status in ('draft','active','paused')),
 payment_reference text not null default '' check(length(payment_reference)<=160),
 agreement_confirmed boolean not null default false,payment_confirmed boolean not null default false,
 approved_by uuid references auth.users(id),approved_at timestamptz,
 updated_at timestamptz not null default now(),
 check(status<>'active' or (agreement_confirmed and payment_confirmed and length(trim(payment_reference))>0 and approved_by is not null)),
 check((plan='community' and section='partners') or (plan='section' and section in ('football','games')) or (plan='main' and section='home') or (plan='featured' and section='trades'))
);
alter table public.local_sponsor_placements enable row level security;
revoke all on public.local_sponsor_placements from public,anon,authenticated;
create table public.local_sponsor_audit(id bigint generated always as identity primary key,placement_id uuid not null,actor uuid not null,action text not null,created_at timestamptz not null default now());
alter table public.local_sponsor_audit enable row level security;
revoke all on public.local_sponsor_audit from public,anon,authenticated;
create or replace function public.local_sponsor_public(p_slot text)
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'business',business,'message',message,'website',website,'plan',plan,'ends_at',ends_at) order by approved_at,id),'[]'::jsonb)
 from public.local_sponsor_placements
 where p_slot in ('partners','home','football','games','trades') and status='active' and starts_at<=now() and ends_at>now()
 and (p_slot='partners' or section=p_slot);
$$;
revoke all on function public.local_sponsor_public(text) from public;
grant execute on function public.local_sponsor_public(text) to anon,authenticated;
create or replace function public.local_sponsor_manage(p_action text,p_payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.local_sponsor_placements%rowtype;pid uuid;st text;
begin
 if auth.uid() is null or not coalesce(public.local_is_owner(),false) then raise exception 'Owner access required';end if;
 if p_action='list' then return coalesce((select jsonb_agg(to_jsonb(t) order by updated_at desc) from public.local_sponsor_placements t),'[]'::jsonb);end if;
 if p_action not in ('save','pause') then raise exception 'Unknown sponsorship action';end if;
 pid:=nullif(p_payload->>'id','')::uuid;
 if p_action='pause' then
  update public.local_sponsor_placements set status='paused',updated_at=now() where id=pid returning * into r;
  if not found then raise exception 'Placement unavailable';end if;
 else
  if octet_length(p_payload::text)>6000 then raise exception 'Request too large';end if;
  st:=coalesce(p_payload->>'status','draft');
  if st='active' and (not coalesce((p_payload->>'agreement_confirmed')::boolean,false) or not coalesce((p_payload->>'payment_confirmed')::boolean,false) or length(trim(coalesce(p_payload->>'payment_reference','')))=0) then raise exception 'Confirm the agreement and payment before activation';end if;
  if (p_payload->>'ends_at')::timestamptz>(p_payload->>'starts_at')::timestamptz+interval '1 year' then raise exception 'Use a placement period of at most one year';end if;
  insert into public.local_sponsor_placements(id,business,message,website,plan,section,starts_at,ends_at,status,payment_reference,agreement_confirmed,payment_confirmed,approved_by,approved_at)
  values(coalesce(pid,gen_random_uuid()),trim(p_payload->>'business'),coalesce(p_payload->>'message',''),coalesce(p_payload->>'website',''),p_payload->>'plan',p_payload->>'section',(p_payload->>'starts_at')::timestamptz,(p_payload->>'ends_at')::timestamptz,st,coalesce(p_payload->>'payment_reference',''),coalesce((p_payload->>'agreement_confirmed')::boolean,false),coalesce((p_payload->>'payment_confirmed')::boolean,false),case when st='active' then auth.uid() end,case when st='active' then now() end)
  on conflict(id) do update set business=excluded.business,message=excluded.message,website=excluded.website,plan=excluded.plan,section=excluded.section,starts_at=excluded.starts_at,ends_at=excluded.ends_at,status=excluded.status,payment_reference=excluded.payment_reference,agreement_confirmed=excluded.agreement_confirmed,payment_confirmed=excluded.payment_confirmed,approved_by=excluded.approved_by,approved_at=excluded.approved_at,updated_at=now() returning * into r;
 end if;
 insert into public.local_sponsor_audit(placement_id,actor,action) values(r.id,auth.uid(),p_action||':'||r.status);
 return to_jsonb(r);
end $$;
revoke all on function public.local_sponsor_manage(text,jsonb) from public,anon;
grant execute on function public.local_sponsor_manage(text,jsonb) to authenticated;
commit;
