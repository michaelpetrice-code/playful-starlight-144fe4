begin;
create table if not exists public.tl_arcade_updates(
 id uuid primary key references public.tl_arcade_matches(id) on delete cascade,
 host uuid not null,guest uuid,version integer not null,status text not null
);
alter table public.tl_arcade_updates enable row level security;
revoke all on public.tl_arcade_updates from public,anon,authenticated;
grant select on public.tl_arcade_updates to authenticated;
grant all on public.tl_arcade_updates to service_role;
drop policy if exists "Arcade participants receive versions" on public.tl_arcade_updates;
create policy "Arcade participants receive versions" on public.tl_arcade_updates for select to authenticated
using((select auth.uid())=host or (select auth.uid())=guest);
create or replace function public.tl_arcade_notify_version() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.tl_arcade_updates(id,host,guest,version,status)
 values(new.id,new.host,new.guest,new.version,new.status)
 on conflict(id) do update set guest=excluded.guest,version=excluded.version,status=excluded.status;
 return new;
end $$;
revoke all on function public.tl_arcade_notify_version() from public,anon,authenticated;
drop trigger if exists tl_arcade_notify on public.tl_arcade_matches;
create trigger tl_arcade_notify after insert or update on public.tl_arcade_matches
for each row execute function public.tl_arcade_notify_version();
insert into public.tl_arcade_updates(id,host,guest,version,status)
select id,host,guest,version,status from public.tl_arcade_matches on conflict do nothing;
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime')
 and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='tl_arcade_updates') then
 alter publication supabase_realtime add table public.tl_arcade_updates;
 end if;
end $$;
commit;
