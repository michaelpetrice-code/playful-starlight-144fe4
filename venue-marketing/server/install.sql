create table public.local_marketing_grants(id uuid primary key default gen_random_uuid(),user_id uuid unique references auth.users(id) on delete cascade,venue_id uuid unique references public.local_venue_directory(id) on delete cascade,granted_by uuid not null references auth.users(id),granted_at timestamptz not null default now(),expires_at timestamptz,constraint marketing_one_grantee check(num_nonnulls(user_id,venue_id)=1));
alter table public.local_marketing_grants enable row level security;
revoke all on public.local_marketing_grants from public,anon,authenticated;
grant all on public.local_marketing_grants to service_role;
create policy "Trusted service manages marketing grants" on public.local_marketing_grants for all to service_role using(true) with check(true);
create table public.local_marketing_campaigns(id uuid primary key,venue_id uuid not null references public.local_venue_directory(id),created_by uuid not null references auth.users(id),brief jsonb not null,content jsonb not null default '{}',source text not null default 'manual' check(source in ('manual','ai','template')),generation_status text not null default 'ready' check(generation_status in ('generating','ready','failed')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index local_marketing_campaigns_venue on public.local_marketing_campaigns(venue_id,updated_at desc);
create table public.local_marketing_usage(venue_id uuid not null references public.local_venue_directory(id),month date not null,count integer not null default 0,primary key(venue_id,month));
create table public.local_marketing_announcements(id uuid primary key,venue_id uuid not null references public.local_venue_directory(id),campaign_id uuid unique not null references public.local_marketing_campaigns(id),title text not null check(length(title) between 1 and 120),body text not null check(length(body) between 1 and 5000),published boolean not null default false,created_by uuid not null references auth.users(id),created_at timestamptz not null default now());
create index local_marketing_announcements_venue on public.local_marketing_announcements(venue_id,created_at desc) where published;
do $$declare t text;begin foreach t in array array['local_marketing_campaigns','local_marketing_usage','local_marketing_announcements'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from public,anon,authenticated',t);execute format('grant all on public.%I to service_role',t);execute format('create policy "Trusted marketing service only" on public.%I for all to service_role using(true) with check(true)',t);end loop;end$$;
grant select on public.local_marketing_announcements to authenticated;
create policy "Members read published venue notices" on public.local_marketing_announcements for select to authenticated using(published and exists(select 1 from public.local_venue_directory v where v.id=venue_id and v.status in ('approved','featured')));
create function public.local_marketing_access(p_user uuid) returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('personal',exists(select 1 from public.local_marketing_grants g where g.user_id=p_user and (g.expires_at is null or g.expires_at>now())),'venues',coalesce((select jsonb_agg(jsonb_build_object('id',v->>'id','name',v->>'name','complimentary',exists(select 1 from public.local_marketing_grants g where g.venue_id=(v->>'id')::uuid and (g.expires_at is null or g.expires_at>now())))) from jsonb_array_elements(public.local_dj_access(p_user)->'venues') v),'[]'::jsonb));
$$;
create function public.local_marketing_reserve(p_id uuid,p_user uuid,p_venue uuid,p_brief jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$declare c public.local_marketing_campaigns;n integer;m date:=date_trunc('month',now())::date;begin
 insert into public.local_marketing_usage(venue_id,month) values(p_venue,m) on conflict do nothing;
 perform 1 from public.local_marketing_usage where venue_id=p_venue and month=m for update;
 select * into c from public.local_marketing_campaigns where id=p_id;
 if found then if c.created_by<>p_user or c.venue_id<>p_venue or c.brief<>p_brief then raise exception 'Draft belongs to another request';end if;return jsonb_build_object('reserved',false,'status',c.generation_status,'content',c.content);end if;
 select count into n from public.local_marketing_usage where venue_id=p_venue and month=m;
 if n>=50 then return jsonb_build_object('reserved',false,'status','limit');end if;
 update public.local_marketing_usage set count=count+1 where venue_id=p_venue and month=m;
 insert into public.local_marketing_campaigns(id,venue_id,created_by,brief,source,generation_status) values(p_id,p_venue,p_user,p_brief,'ai','generating');return jsonb_build_object('reserved',true,'remaining',49-n);
end$$;
create function public.local_marketing_finish(p_id uuid,p_content jsonb,p_success boolean) returns void language plpgsql security invoker set search_path='' as $$declare c public.local_marketing_campaigns;begin
 select * into c from public.local_marketing_campaigns where id=p_id for update;
 if not found or c.generation_status<>'generating' then return;end if;
 update public.local_marketing_campaigns set content=coalesce(p_content,'{}'),generation_status=case when p_success then 'ready' else 'failed' end,updated_at=now() where id=p_id;
 if not p_success then update public.local_marketing_usage set count=greatest(count-1,0) where venue_id=c.venue_id and month=date_trunc('month',c.created_at)::date;end if;
end$$;
revoke all on function public.local_marketing_access(uuid),public.local_marketing_reserve(uuid,uuid,uuid,jsonb),public.local_marketing_finish(uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.local_marketing_access(uuid),public.local_marketing_reserve(uuid,uuid,uuid,jsonb),public.local_marketing_finish(uuid,jsonb,boolean) to service_role;
