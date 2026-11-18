-- RUN AFTER OWNER-SETUP-v52.sql AND OWNER-SETUP-v53.sql.
-- Private owner content editor; no owner identifiers or secret keys in the browser.
create table if not exists public.local_owner_content (
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('announcement','event','competition')),
 title text not null check(length(title) between 1 and 120),body text not null check(length(body) between 1 and 5000),
 image_path text,event_at timestamptz,publish_at timestamptz,
 status text not null default 'draft' check(status in ('draft','published')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now());
alter table public.local_owner_content enable row level security;
revoke all on public.local_owner_content from public,anon,authenticated;
-- Storage bucket: public read of published poster assets; only owner may upload.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('local-content-images','local-content-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Local owner uploads posters" on storage.objects;
create policy "Local owner uploads posters" on storage.objects for insert to authenticated
with check(bucket_id='local-content-images' and public.local_is_owner());
drop policy if exists "Local owner removes posters" on storage.objects;
create policy "Local owner removes posters" on storage.objects for delete to authenticated
using(bucket_id='local-content-images' and public.local_is_owner());
create or replace function public.local_owner_content_save(p_id uuid,p_kind text,p_title text,p_body text,p_event_at timestamptz,p_publish_at timestamptz,p_image_path text,p_status text)
returns uuid language plpgsql security definer set search_path='' as $$declare v_id uuid;begin
 if not public.local_is_owner() then raise exception 'Owner only' using errcode='42501';end if;
 if p_kind not in ('announcement','event','competition') or p_status not in ('draft','published') or length(trim(coalesce(p_title,''))) not between 1 and 120 or length(trim(coalesce(p_body,''))) not between 1 and 5000 then raise exception 'Invalid content';end if;
 if p_image_path is not null and (length(p_image_path)>160 or p_image_path !~ '^[a-zA-Z0-9_-]+\.(jpg|png|webp)$') then raise exception 'Invalid poster path';end if;
 if p_id is null then
 insert into public.local_owner_content(kind,title,body,event_at,publish_at,image_path,status)
 values(p_kind,trim(p_title),trim(p_body),p_event_at,coalesce(p_publish_at,now()),p_image_path,p_status) returning id into v_id;
 else update public.local_owner_content set kind=p_kind,title=trim(p_title),body=trim(p_body),event_at=p_event_at,publish_at=coalesce(p_publish_at,now()),image_path=p_image_path,status=p_status,updated_at=now() where id=p_id returning id into v_id;
 if v_id is null then raise exception 'Content not found';end if;end if;
 insert into public.local_owner_audit_log(actor,action,details) values(auth.uid(),'content_save',v_id::text||' ('||p_kind||', '||p_status||')');return v_id;
end$$;
create or replace function public.local_owner_content_list() returns jsonb language plpgsql security definer set search_path='' as $$declare v jsonb;begin
 if not public.local_is_owner() then raise exception 'Owner only' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v from (select * from public.local_owner_content order by created_at desc limit 150)x;return v;end$$;
create or replace function public.local_owner_content_status(p_id uuid,p_status text) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.local_is_owner() then raise exception 'Owner only' using errcode='42501';end if;
 if p_status not in ('draft','published') then raise exception 'Invalid status';end if;
 update public.local_owner_content set status=p_status,updated_at=now() where id=p_id;
 if not found then raise exception 'Content not found';end if;
 insert into public.local_owner_audit_log(actor,action,details) values(auth.uid(),'content_status',p_id::text||' -> '||p_status);
end$$;
create or replace function public.local_owner_content_delete(p_id uuid) returns void language plpgsql security definer set search_path='' as $$begin
 if not public.local_is_owner() then raise exception 'Owner only' using errcode='42501';end if;
 delete from public.local_owner_content where id=p_id;
 if not found then raise exception 'Content not found';end if;
 insert into public.local_owner_audit_log(actor,action,details) values(auth.uid(),'content_delete',p_id::text);
end$$;
create or replace function public.local_public_content() returns jsonb language plpgsql stable security definer set search_path='' as $$declare v jsonb;begin
 if auth.uid() is null or public.local_my_account_status()<>'active' then return '[]'::jsonb;end if;
 select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into v from (select id,kind,title,body,image_path,event_at,publish_at from public.local_owner_content where status='published' and publish_at<=now() order by publish_at desc limit 20)x;return v;end$$;
revoke all on function public.local_owner_content_save(uuid,text,text,text,timestamptz,timestamptz,text,text),public.local_owner_content_list(),public.local_owner_content_status(uuid,text),public.local_owner_content_delete(uuid),public.local_public_content() from public,anon;
grant execute on function public.local_owner_content_save(uuid,text,text,text,timestamptz,timestamptz,text,text),public.local_owner_content_list(),public.local_owner_content_status(uuid,text),public.local_owner_content_delete(uuid),public.local_public_content() to authenticated;
-- Scheduling is automatic on page read: a future-dated published item appears
-- once publish_at has passed. No background cron job is required.
-- Uploaded poster URLs are publicly accessible to anyone who has the URL;
-- avoid uploading confidential media to this bucket.
