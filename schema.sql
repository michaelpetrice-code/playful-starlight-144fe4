-- Run once in Supabase SQL Editor. The invitation code is a bearer secret: share only with trusted members.
create extension if not exists pgcrypto;
create table if not exists public.groups (id uuid primary key default gen_random_uuid(), name text not null, owner_id uuid not null references auth.users(id), invite_code text not null unique default encode(gen_random_bytes(12),'hex'), created_at timestamptz not null default now());
create table if not exists public.group_members (group_id uuid not null references public.groups(id) on delete cascade, user_id uuid not null references auth.users(id) on delete cascade, joined_at timestamptz not null default now(), primary key(group_id,user_id));
create table if not exists public.posts (id uuid primary key default gen_random_uuid(), group_id uuid not null references public.groups(id) on delete cascade, user_id uuid not null references auth.users(id), kind text not null check(kind in ('chat','event','rsvp','round','photo','football','kitty','quiz','game_score','ttt_start','ttt_move','challenge')), data jsonb not null default '{}'::jsonb, created_at timestamptz not null default now());
create index if not exists posts_group_created on public.posts(group_id,created_at desc);
create or replace function public.is_group_member(g uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.group_members m where m.group_id=g and m.user_id=(select auth.uid())) $$;
create or replace function public.join_group_by_code(code text) returns uuid language plpgsql security definer set search_path='' as $$ declare gid uuid; begin if auth.uid() is null then raise exception 'Sign in required'; end if; select id into gid from public.groups where invite_code=lower(trim(code)); if gid is null then raise exception 'Invalid invite code'; end if; insert into public.group_members(group_id,user_id) values(gid,auth.uid()) on conflict do nothing; return gid; end $$;
revoke all on function public.join_group_by_code(text) from public,anon;
grant execute on function public.join_group_by_code(text) to authenticated;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.posts enable row level security;
create policy "group members read group" on public.groups for select to authenticated using(public.is_group_member(id) or owner_id=(select auth.uid()));
create policy "owner creates group" on public.groups for insert to authenticated with check(owner_id=(select auth.uid()));
create policy "members see own membership" on public.group_members for select to authenticated using(user_id=(select auth.uid()));
create policy "owner adds own membership" on public.group_members for insert to authenticated with check(user_id=(select auth.uid()) and exists(select 1 from public.groups g where g.id=group_id and g.owner_id=(select auth.uid())));
create policy "members read posts" on public.posts for select to authenticated using(public.is_group_member(group_id));
create policy "members write own posts" on public.posts for insert to authenticated with check(user_id=(select auth.uid()) and public.is_group_member(group_id));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('pub-photos','pub-photos',false,5242880,array['image/jpeg']) on conflict(id) do update set public=false;
create policy "members upload photos" on storage.objects for insert to authenticated with check(bucket_id='pub-photos' and public.is_group_member((split_part(name,'/',1))::uuid) and (storage.foldername(name))[1] = split_part(name,'/',1));
create policy "members view photos" on storage.objects for select to authenticated using(bucket_id='pub-photos' and public.is_group_member((split_part(name,'/',1))::uuid));

-- Enable group-scoped realtime updates for chat and games.
do $$ begin alter publication supabase_realtime add table public.posts; exception when duplicate_object then null; end $$;
