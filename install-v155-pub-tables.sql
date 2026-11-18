-- Requires SECURE-TABLES-v121.sql, TABLES-v123.sql and the venue directory.
begin;

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
commit;
