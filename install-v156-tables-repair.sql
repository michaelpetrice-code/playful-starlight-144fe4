-- The Local: run in the Supabase project used by the deployed site.
-- Preserves venue, table, member and message records.
begin;

create table if not exists public.local_venue_directory (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 2 and 90),
 type text not null, town text not null,
 description text not null default '', website text,
 status text not null default 'draft' check(status in ('draft','approved','featured','suspended')),
 verified boolean not null default false,
 created_at timestamptz not null default now()
);
alter table public.local_venue_directory enable row level security;
grant select(id,name,type,town,description,website,status,verified) on public.local_venue_directory to anon,authenticated;
drop policy if exists "Public sees published venues v42" on public.local_venue_directory;
create policy "Public sees published venues v42" on public.local_venue_directory
  for select to anon,authenticated using(status in ('approved','featured'));

-- Optional: run in the SAME Supabase project as The Local after VENUE-PLATFORM-SETUP.sql.
-- The Local v99 already displays Coombe Social Club locally, so this is only
-- needed to persist the venue in the shared directory table.
-- This is not a claim that venue ownership has been externally verified.
insert into public.local_venue_directory
(name,type,town,description,website,status,verified)
select 'Coombe Social Club','Social club','Coventry',
'A Coventry social club with a concert room, lounge, events, games and room hire.',
'https://www.coombesocialclub.co.uk/','featured',false
where not exists (
 select 1 from public.local_venue_directory
 where lower(trim(name)) in ('coombe social club','the coombe social club')
);

-- Run after schema.sql. Independent secure table system; does not migrate legacy tables.
create extension if not exists pgcrypto;
create table if not exists public.tl_tables (id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 3 and 90), description text not null default '', owner_id uuid not null references auth.users(id), created_at timestamptz not null default now());
create table if not exists public.tl_table_members (table_id uuid not null references public.tl_tables(id) on delete cascade, user_id uuid not null references auth.users(id), role text not null default 'member' check(role in ('owner','moderator','member')), status text not null default 'pending' check(status in ('pending','approved','banned')), joined_at timestamptz not null default now(), primary key(table_id,user_id));
create or replace function public.tl_is_member(t uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.tl_table_members where table_id=t and user_id=auth.uid() and status='approved') $$;
create or replace function public.tl_is_admin(t uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.tl_table_members where table_id=t and user_id=auth.uid() and status='approved' and role in ('owner','moderator')) $$;
create table if not exists public.tl_table_posts(id uuid primary key default gen_random_uuid(),table_id uuid not null references public.tl_tables(id) on delete cascade,user_id uuid not null references auth.users(id),body text not null default '' check(length(body)<=5000),media_path text,media_type text check(media_type in ('image','video')),hidden boolean not null default false,created_at timestamptz not null default now(),check(length(trim(body))>0 or media_path is not null));
create table if not exists public.tl_table_reactions(post_id uuid not null references public.tl_table_posts(id) on delete cascade,user_id uuid not null references auth.users(id),primary key(post_id,user_id));
create table if not exists public.tl_table_events(id uuid primary key default gen_random_uuid(),table_id uuid not null references public.tl_tables(id) on delete cascade,creator_id uuid not null references auth.users(id),title text not null check(length(title) between 3 and 140),details text not null default '',starts_at timestamptz not null,created_at timestamptz not null default now());
create table if not exists public.tl_table_rsvps(event_id uuid not null references public.tl_table_events(id) on delete cascade,user_id uuid not null references auth.users(id),response text not null check(response in ('going','interested','not_going')),primary key(event_id,user_id));
create index if not exists tl_posts_recent on public.tl_table_posts(table_id,created_at desc);
create index if not exists tl_members_pending on public.tl_table_members(table_id,status);
-- Create table and owner membership atomically; prevent spoofed owners.
create or replace function public.tl_create_table(p_name text,p_description text default '') returns uuid language plpgsql security definer set search_path=public as $$ declare tid uuid; begin if auth.uid() is null then raise exception 'Sign in required';end if; insert into public.tl_tables(name,description,owner_id) values(trim(p_name),left(coalesce(p_description,''),1000),auth.uid()) returning id into tid;insert into public.tl_table_members(table_id,user_id,role,status) values(tid,auth.uid(),'owner','approved');return tid;end $$;
create or replace function public.tl_manage_member(p_table uuid,p_user uuid,p_action text) returns void language plpgsql security definer set search_path=public as $$ declare actor_role text; target_role text; begin select role into actor_role from public.tl_table_members where table_id=p_table and user_id=auth.uid() and status='approved'; if actor_role not in ('owner','moderator') then raise exception 'Not authorised';end if;select role into target_role from public.tl_table_members where table_id=p_table and user_id=p_user; if target_role='owner' then raise exception 'Owner cannot be changed';end if;if actor_role='moderator' and target_role='moderator' then raise exception 'Owner permission required';end if; if p_action='approve' then update public.tl_table_members set status='approved' where table_id=p_table and user_id=p_user and status='pending';elsif p_action='ban' then update public.tl_table_members set status='banned' where table_id=p_table and user_id=p_user;elsif p_action='remove' then delete from public.tl_table_members where table_id=p_table and user_id=p_user;elsif p_action='promote' and actor_role='owner' then update public.tl_table_members set role='moderator' where table_id=p_table and user_id=p_user and status='approved';elsif p_action='demote' and actor_role='owner' then update public.tl_table_members set role='member' where table_id=p_table and user_id=p_user and status='approved';else raise exception 'Invalid action';end if;end $$;
create or replace function public.tl_hide_post(p_post uuid,p_hidden boolean) returns void language plpgsql security definer set search_path=public as $$ begin update public.tl_table_posts set hidden=p_hidden where id=p_post and public.tl_is_admin(table_id);if not found then raise exception 'Not authorised';end if;end $$;
revoke all on function public.tl_create_table(text,text),public.tl_manage_member(uuid,uuid,text),public.tl_hide_post(uuid,boolean) from public,anon;
grant execute on function public.tl_create_table(text,text),public.tl_manage_member(uuid,uuid,text),public.tl_hide_post(uuid,boolean) to authenticated;
-- Disable all direct writes to tables and memberships, except self-request membership.
alter table public.tl_tables enable row level security;alter table public.tl_table_members enable row level security;alter table public.tl_table_posts enable row level security;alter table public.tl_table_reactions enable row level security;alter table public.tl_table_events enable row level security;alter table public.tl_table_rsvps enable row level security;
drop policy if exists "tables discover" on public.tl_tables;
create policy "tables discover" on public.tl_tables for select to authenticated using(true);
drop policy if exists "owners edit tables" on public.tl_tables;
create policy "owners edit tables" on public.tl_tables for update to authenticated using(owner_id=auth.uid()) with check(owner_id=auth.uid());
drop policy if exists "members see members" on public.tl_table_members;
create policy "members see members" on public.tl_table_members for select to authenticated using(user_id=auth.uid() or public.tl_is_admin(table_id));
drop policy if exists "request to join" on public.tl_table_members;
create policy "request to join" on public.tl_table_members for insert to authenticated with check(user_id=auth.uid() and role='member' and status='pending');
drop policy if exists "members read posts" on public.tl_table_posts;
create policy "members read posts" on public.tl_table_posts for select to authenticated using(public.tl_is_member(table_id) and (not hidden or public.tl_is_admin(table_id) or user_id=auth.uid()));
drop policy if exists "members create posts" on public.tl_table_posts;
create policy "members create posts" on public.tl_table_posts for insert to authenticated with check(user_id=auth.uid() and public.tl_is_member(table_id) and hidden=false and (media_path is null or (split_part(media_path,'/',1)=table_id::text and split_part(media_path,'/',2)=auth.uid()::text)));
drop policy if exists "authors delete posts" on public.tl_table_posts;
create policy "authors delete posts" on public.tl_table_posts for delete to authenticated using((user_id=auth.uid() or public.tl_is_admin(table_id)) and public.tl_is_member(table_id));
drop policy if exists "members read likes" on public.tl_table_reactions;
create policy "members read likes" on public.tl_table_reactions for select to authenticated using(exists(select 1 from public.tl_table_posts p where p.id=post_id and public.tl_is_member(p.table_id)));
drop policy if exists "members like" on public.tl_table_reactions;
create policy "members like" on public.tl_table_reactions for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.tl_table_posts p where p.id=post_id and public.tl_is_member(p.table_id)));
drop policy if exists "unlike" on public.tl_table_reactions;
create policy "unlike" on public.tl_table_reactions for delete to authenticated using(user_id=auth.uid());
drop policy if exists "members read events" on public.tl_table_events;
create policy "members read events" on public.tl_table_events for select to authenticated using(public.tl_is_member(table_id));
drop policy if exists "admins create events" on public.tl_table_events;
create policy "admins create events" on public.tl_table_events for insert to authenticated with check(creator_id=auth.uid() and public.tl_is_admin(table_id));
drop policy if exists "admins delete events" on public.tl_table_events;
create policy "admins delete events" on public.tl_table_events for delete to authenticated using(public.tl_is_admin(table_id));
drop policy if exists "members see rsvps" on public.tl_table_rsvps;
create policy "members see rsvps" on public.tl_table_rsvps for select to authenticated using(exists(select 1 from public.tl_table_events e where e.id=event_id and public.tl_is_member(e.table_id)));
drop policy if exists "members rsvp" on public.tl_table_rsvps;
create policy "members rsvp" on public.tl_table_rsvps for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.tl_table_events e where e.id=event_id and public.tl_is_member(e.table_id)));
drop policy if exists "members update rsvp" on public.tl_table_rsvps;
create policy "members update rsvp" on public.tl_table_rsvps for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('tl-table-media','tl-table-media',false,52428800,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']) on conflict(id) do update set public=false,file_size_limit=52428800,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "table member upload media" on storage.objects;
create policy "table member upload media" on storage.objects for insert to authenticated with check(bucket_id='tl-table-media' and (storage.foldername(name))[2]=auth.uid()::text and public.tl_is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "table member read media" on storage.objects;
create policy "table member read media" on storage.objects for select to authenticated using(bucket_id='tl-table-media' and public.tl_is_member(((storage.foldername(name))[1])::uuid));
drop policy if exists "author delete media" on storage.objects;
create policy "author delete media" on storage.objects for delete to authenticated using(bucket_id='tl-table-media' and (storage.foldername(name))[2]=auth.uid()::text);

-- v123: run AFTER SECURE-TABLES-v121.sql; back up the database first.
-- Legacy migration is a separate, explicit admin operation (see MIGRATION-v123.sql).
create table if not exists public.tl_table_comments(id uuid primary key default gen_random_uuid(),post_id uuid not null references public.tl_table_posts(id) on delete cascade,user_id uuid not null references auth.users(id),body text not null check(length(trim(body)) between 1 and 2000),created_at timestamptz not null default now());
create index if not exists tl_comments_post on public.tl_table_comments(post_id,created_at);
create table if not exists public.tl_table_invites(id uuid primary key default gen_random_uuid(),table_id uuid not null references public.tl_tables(id) on delete cascade,token_hash text not null unique,created_by uuid not null references auth.users(id),expires_at timestamptz not null default (now()+interval '7 days'),used_by uuid references auth.users(id),created_at timestamptz not null default now());
create table if not exists public.tl_table_reports(id uuid primary key default gen_random_uuid(),table_id uuid not null references public.tl_tables(id) on delete cascade,post_id uuid references public.tl_table_posts(id) on delete set null,reporter_id uuid not null references auth.users(id),reason text not null check(length(trim(reason)) between 5 and 1000),status text not null default 'open' check(status in ('open','resolved','dismissed')),created_at timestamptz not null default now());
create table if not exists public.tl_table_audit(id bigint generated always as identity primary key,table_id uuid not null references public.tl_tables(id) on delete cascade,actor_id uuid references auth.users(id),action text not null,details jsonb not null default '{}'::jsonb,created_at timestamptz not null default now());
create index if not exists tl_audit_recent on public.tl_table_audit(table_id,created_at desc);
create or replace function public.tl_log_action(p_table uuid,p_action text,p_details jsonb default '{}'::jsonb) returns void language plpgsql security definer set search_path=public as $$begin if not public.tl_is_admin(p_table) then raise exception 'Not authorised';end if; if p_action not in ('table_updated','event_created','event_deleted','post_deleted','post_hidden','report_reviewed') then raise exception 'Invalid action';end if;insert into public.tl_table_audit(table_id,actor_id,action,details) values(p_table,auth.uid(),p_action,coalesce(p_details,'{}'::jsonb));end$$;
create or replace function public.tl_invite_create(p_table uuid) returns text language plpgsql security definer set search_path=public as $$declare token text;begin if not public.tl_is_admin(p_table) then raise exception 'Not authorised';end if;token:=encode(gen_random_bytes(24),'hex');insert into public.tl_table_invites(table_id,token_hash,created_by) values(p_table,encode(digest(token,'sha256'),'hex'),auth.uid());insert into public.tl_table_audit(table_id,actor_id,action) values(p_table,auth.uid(),'invite_created');return token;end$$;
create or replace function public.tl_invite_accept(p_token text) returns uuid language plpgsql security definer set search_path=public as $$declare inv public.tl_table_invites%rowtype;begin if auth.uid() is null then raise exception 'Sign in required';end if;select * into inv from public.tl_table_invites where token_hash=encode(digest(p_token,'sha256'),'hex') and expires_at>now() and used_by is null for update;if not found then raise exception 'Invite expired or already used';end if;if exists(select 1 from public.tl_table_members where table_id=inv.table_id and user_id=auth.uid() and status='banned') then raise exception 'Membership restricted';end if;insert into public.tl_table_members(table_id,user_id,role,status) values(inv.table_id,auth.uid(),'member','approved') on conflict(table_id,user_id) do update set status='approved' where public.tl_table_members.status='pending';update public.tl_table_invites set used_by=auth.uid() where id=inv.id;insert into public.tl_table_audit(table_id,actor_id,action) values(inv.table_id,auth.uid(),'invite_accepted');return inv.table_id;end$$;
create or replace function public.tl_report_review(p_id uuid,p_status text) returns void language plpgsql security definer set search_path=public as $$declare t uuid;begin if p_status not in ('resolved','dismissed','open') then raise exception 'Invalid status';end if;select table_id into t from public.tl_table_reports where id=p_id;if t is null or not public.tl_is_admin(t) then raise exception 'Not authorised';end if;update public.tl_table_reports set status=p_status where id=p_id;insert into public.tl_table_audit(table_id,actor_id,action,details) values(t,auth.uid(),'report_reviewed',jsonb_build_object('report_id',p_id,'status',p_status));end$$;
-- Audit membership changes at the database boundary, including changes made by existing v121 RPC.
create or replace function public.tl_membership_audit_trigger() returns trigger language plpgsql security definer set search_path=public as $$begin insert into public.tl_table_audit(table_id,actor_id,action,details) values(coalesce(new.table_id,old.table_id),auth.uid(),case when tg_op='INSERT' then 'member_added' when tg_op='DELETE' then 'member_removed' else 'member_updated' end,jsonb_build_object('user_id',coalesce(new.user_id,old.user_id),'status',case when tg_op='DELETE' then old.status else new.status end,'role',case when tg_op='DELETE' then old.role else new.role end));return coalesce(new,old);end$$;
drop trigger if exists tl_membership_audit on public.tl_table_members;create trigger tl_membership_audit after insert or update or delete on public.tl_table_members for each row execute function public.tl_membership_audit_trigger();
alter table public.tl_table_comments enable row level security;alter table public.tl_table_invites enable row level security;alter table public.tl_table_reports enable row level security;alter table public.tl_table_audit enable row level security;
drop policy if exists "members read comments" on public.tl_table_comments;
create policy "members read comments" on public.tl_table_comments for select to authenticated using(exists(select 1 from public.tl_table_posts p where p.id=post_id and public.tl_is_member(p.table_id) and (not p.hidden or public.tl_is_admin(p.table_id) or p.user_id=auth.uid())));
drop policy if exists "members write comments" on public.tl_table_comments;
create policy "members write comments" on public.tl_table_comments for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.tl_table_posts p where p.id=post_id and not p.hidden and public.tl_is_member(p.table_id)));
drop policy if exists "authors delete comments" on public.tl_table_comments;
create policy "authors delete comments" on public.tl_table_comments for delete to authenticated using(user_id=auth.uid() or exists(select 1 from public.tl_table_posts p where p.id=post_id and public.tl_is_admin(p.table_id)));
drop policy if exists "members report posts" on public.tl_table_reports;
create policy "members report posts" on public.tl_table_reports for insert to authenticated with check(reporter_id=auth.uid() and exists(select 1 from public.tl_table_posts p where p.id=post_id and p.table_id=table_id and public.tl_is_member(table_id)));
drop policy if exists "reports visible to reporters and admins" on public.tl_table_reports;
create policy "reports visible to reporters and admins" on public.tl_table_reports for select to authenticated using(reporter_id=auth.uid() or public.tl_is_admin(table_id));
drop policy if exists "admins read audit" on public.tl_table_audit;
create policy "admins read audit" on public.tl_table_audit for select to authenticated using(public.tl_is_admin(table_id));
revoke all on function public.tl_log_action(uuid,text,jsonb),public.tl_invite_create(uuid),public.tl_invite_accept(text),public.tl_report_review(uuid,text) from public,anon;
grant execute on function public.tl_log_action(uuid,text,jsonb),public.tl_invite_create(uuid),public.tl_invite_accept(text),public.tl_report_review(uuid,text) to authenticated;

-- Requires SECURE-TABLES-v121.sql, TABLES-v123.sql and the venue directory.

alter table public.tl_tables
  add column if not exists venue_id uuid references public.local_venue_directory(id) on delete restrict;
create index if not exists tl_tables_by_venue on public.tl_tables(venue_id, created_at desc);

create or replace function public.tl_set_table_venue(p_table uuid, p_venue uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.local_venue_directory where id=p_venue and status in ('approved','featured')) then
    raise exception 'Choose an approved venue.';
  end if;
  update public.tl_tables set venue_id=p_venue
    where id=p_table and owner_id=auth.uid() and venue_id is null;
  if not found then raise exception 'Only an owner can place an existing table without a venue.'; end if;
end $$;

create or replace function public.tl_create_venue_table(p_venue uuid,p_name text,p_description text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare new_table uuid;
begin
  if auth.uid() is null then raise exception 'Sign in required.'; end if;
  if not exists (select 1 from public.local_venue_directory where id=p_venue and status in ('approved','featured')) then
    raise exception 'Choose an approved venue.';
  end if;
  insert into public.tl_tables(venue_id,name,description,owner_id)
    values(p_venue,trim(p_name),left(coalesce(p_description,''),1000),auth.uid()) returning id into new_table;
  insert into public.tl_table_members(table_id,user_id,role,status)
    values(new_table,auth.uid(),'owner','approved');
  return new_table;
end $$;
-- The legacy creator cannot bypass the venue requirement after this upgrade.
revoke execute on function public.tl_create_table(text,text) from public,anon,authenticated;
-- Keep the venue immutable through ordinary table edits.
revoke update on public.tl_tables from public,anon,authenticated;
grant update(name,description) on public.tl_tables to authenticated;

create or replace function public.tl_venue_invite_accept(p_token text,p_venue uuid)
returns uuid language plpgsql security definer set search_path = public,extensions as $$
begin
  if auth.uid() is null then raise exception 'Sign in required.'; end if;
  if not exists (
    select 1 from public.tl_table_invites i
    join public.tl_tables t on t.id=i.table_id
    join public.local_venue_directory v on v.id=t.venue_id
    where i.token_hash=encode(digest(p_token,'sha256'),'hex') and t.venue_id=p_venue
      and v.status in ('approved','featured')
  ) then raise exception 'This invitation does not match the selected venue.'; end if;
  return public.tl_invite_accept(p_token);
end $$;
revoke execute on function public.tl_invite_accept(text) from public,anon,authenticated;

drop policy if exists "request to join" on public.tl_table_members;
create policy "request to join" on public.tl_table_members for insert to authenticated with check(
  user_id=auth.uid() and role='member' and status='pending'
  and exists(select 1 from public.tl_tables t join public.local_venue_directory v on v.id=t.venue_id
    where t.id=tl_table_members.table_id and v.status in ('approved','featured'))
);

create or replace function public.tl_table_seats(p_table uuid)
returns table(user_id uuid, display_name text, role text)
language sql stable security definer set search_path = '' as $$
  select m.user_id,
    left(coalesce(nullif(btrim(u.raw_user_meta_data->>'display_name'),''),'Member'),60),
    m.role
  from public.tl_table_members m join auth.users u on u.id=m.user_id
  where m.table_id=p_table and m.status='approved' and public.tl_is_member(p_table)
  order by (m.role='owner') desc,m.joined_at,m.user_id
$$;

alter table public.tl_table_posts add column if not exists reply_to uuid;
alter table public.tl_table_posts add column if not exists edited_at timestamptz;
do $$begin
  if not exists(select 1 from pg_constraint where conrelid='public.tl_table_posts'::regclass and conname='tl_post_reply_fkey') then
    alter table public.tl_table_posts add constraint tl_post_reply_fkey
      foreign key(reply_to) references public.tl_table_posts(id) on delete set null;
  end if;
end$$;
create index if not exists tl_post_reply_idx on public.tl_table_posts(reply_to) where reply_to is not null;
drop policy if exists "members create posts" on public.tl_table_posts;
create or replace function public.tl_can_reply(p_table uuid,p_post uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.tl_is_member(p_table) and exists(
    select 1 from public.tl_table_posts where id=p_post and table_id=p_table and not hidden
  )
$$;
create policy "members create posts" on public.tl_table_posts for insert to authenticated with check(
  user_id=auth.uid() and public.tl_is_member(table_id) and hidden=false and edited_at is null
  and (reply_to is null or public.tl_can_reply(table_id,reply_to))
  and (media_path is null or (split_part(media_path,'/',1)=table_id::text and split_part(media_path,'/',2)=auth.uid()::text))
);
create or replace function public.tl_edit_table_message(p_message uuid,p_body text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.tl_table_posts set body=trim(p_body),edited_at=now()
  where id=p_message and user_id=auth.uid() and public.tl_is_member(table_id) and not hidden
    and p_body is not null and length(trim(p_body))<=5000 and (length(trim(p_body))>0 or media_path is not null);
  if not found then raise exception 'This message could not be edited.'; end if;
end $$;
alter table public.tl_table_posts drop constraint if exists tl_table_posts_media_type_check;
alter table public.tl_table_posts add constraint tl_table_posts_media_type_check
  check(media_type in ('image','video','audio','document'));
update storage.buckets set allowed_mime_types=array['image/jpeg','image/png','image/webp','video/mp4','video/webm','audio/webm','audio/ogg','audio/mp4','audio/mpeg','application/pdf']
  where id='tl-table-media';

drop policy if exists "members report posts" on public.tl_table_reports;
create policy "members report posts" on public.tl_table_reports for insert to authenticated with check(
  reporter_id=auth.uid() and public.tl_is_member(table_id)
  and exists(select 1 from public.tl_table_posts p
    where p.id=tl_table_reports.post_id and p.table_id=tl_table_reports.table_id)
);

-- Close the existing NULL-role permission gap and retain the role rules and audit trigger.
create or replace function public.tl_manage_member(p_table uuid,p_user uuid,p_action text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_role text; target_role text;
begin
  select role into actor_role from public.tl_table_members
    where table_id=p_table and user_id=auth.uid() and status='approved';
  if actor_role is null or actor_role not in ('owner','moderator') then raise exception 'Not authorised'; end if;
  select role into target_role from public.tl_table_members where table_id=p_table and user_id=p_user;
  if target_role='owner' then raise exception 'Owner cannot be changed'; end if;
  if actor_role='moderator' and target_role='moderator' then raise exception 'Owner permission required'; end if;
  if p_action='approve' then
    update public.tl_table_members set status='approved' where table_id=p_table and user_id=p_user and status='pending';
  elsif p_action='ban' then
    update public.tl_table_members set status='banned' where table_id=p_table and user_id=p_user;
  elsif p_action='remove' then
    delete from public.tl_table_members where table_id=p_table and user_id=p_user;
  elsif p_action in ('promote','demote') and actor_role='owner' then
    update public.tl_table_members set role=case when p_action='promote' then 'moderator' else 'member' end
      where table_id=p_table and user_id=p_user and status='approved';
  else raise exception 'Invalid action';
  end if;
end $$;

revoke all on function public.tl_set_table_venue(uuid,uuid), public.tl_create_venue_table(uuid,text,text),
  public.tl_venue_invite_accept(text,uuid), public.tl_table_seats(uuid), public.tl_can_reply(uuid,uuid),
  public.tl_edit_table_message(uuid,text) from public,anon;
grant execute on function public.tl_set_table_venue(uuid,uuid), public.tl_create_venue_table(uuid,text,text),
  public.tl_venue_invite_accept(text,uuid), public.tl_table_seats(uuid), public.tl_can_reply(uuid,uuid),
  public.tl_edit_table_message(uuid,text) to authenticated;

-- Support projects that do not grant API access to new tables by default.
grant select on public.tl_tables,public.tl_table_members,public.tl_table_posts,
  public.tl_table_reactions,public.tl_table_events,public.tl_table_rsvps,
  public.tl_table_comments,public.tl_table_reports,public.tl_table_audit to authenticated;
grant insert on public.tl_table_members,public.tl_table_posts,public.tl_table_reactions,
  public.tl_table_events,public.tl_table_rsvps,public.tl_table_comments,
  public.tl_table_reports to authenticated;
grant delete on public.tl_table_posts,public.tl_table_reactions,
  public.tl_table_events,public.tl_table_comments to authenticated;
grant update on public.tl_table_rsvps to authenticated;
notify pgrst,'reload schema';
commit;

select to_regclass('public.local_venue_directory') is not null as venue_directory_ready,
       to_regprocedure('public.tl_create_venue_table(uuid,text,text)') is not null as table_creation_ready,
       count(*) filter (where status in ('approved','featured')) as selectable_venues
from public.local_venue_directory;
