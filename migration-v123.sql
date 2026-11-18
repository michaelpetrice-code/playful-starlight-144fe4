-- LEGACY MIGRATION: run only after reviewing PREVIEW queries and making a backup.
-- Maps public.groups to tl_tables with identical UUIDs; preserves legacy groups/posts.
-- This script migrates group metadata, members, and text chat posts only.
-- It does NOT import legacy photo URLs, events, games, or attachments; manual mapping is needed.
-- PREVIEW:
select count(*) as legacy_groups from public.groups;
select count(*) as legacy_members from public.group_members;
select count(*) as legacy_text_posts from public.posts where kind='chat';
-- STOP HERE for preview. To execute migration, copy the statements BELOW into a NEW SQL query.
/* BEGIN EXECUTION (remove this opening comment and matching closing comment at end)
begin;
insert into public.tl_tables(id,name,description,owner_id,created_at)
select g.id,left(g.name,90),'Imported from legacy tables',g.owner_id,g.created_at from public.groups g
where length(g.name)>=3 on conflict(id) do nothing;
insert into public.tl_table_members(table_id,user_id,role,status,joined_at)
select g.id,g.owner_id,'owner','approved',g.created_at from public.groups g join public.tl_tables t on t.id=g.id
on conflict(table_id,user_id) do nothing;
insert into public.tl_table_members(table_id,user_id,role,status,joined_at)
select m.group_id,m.user_id,case when m.user_id=g.owner_id then 'owner' else 'member' end,'approved',m.joined_at
from public.group_members m join public.groups g on g.id=m.group_id join public.tl_tables t on t.id=g.id
on conflict(table_id,user_id) do nothing;
-- Only text chat records with nonempty body are imported, preserving IDs for rerun safety.
insert into public.tl_table_posts(id,table_id,user_id,body,created_at)
select p.id,p.group_id,p.user_id,left(trim(coalesce(p.data->>'text',p.data->>'message',p.data->>'body','')),5000),p.created_at
from public.posts p join public.tl_tables t on t.id=p.group_id
join public.tl_table_members m on m.table_id=p.group_id and m.user_id=p.user_id and m.status='approved'
where p.kind='chat' and length(trim(coalesce(p.data->>'text',p.data->>'message',p.data->>'body','')))>0
on conflict(id) do nothing;
commit;
*/
