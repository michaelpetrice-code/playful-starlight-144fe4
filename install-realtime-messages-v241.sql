-- Explicitly requested: live message alerts. Existing RLS, grants and membership rules are unchanged.
-- Fail closed if any message table has lost RLS or its SELECT policy.
do $$ declare target text;begin
 foreach target in array array['tl_table_posts','private_chat_messages','market_messages','local_member_notices'] loop
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=target and c.relrowsecurity)
   or not exists(select 1 from pg_policies where schemaname='public' and tablename=target and cmd='SELECT') then
    raise exception 'Message publication requires existing RLS and a SELECT policy: %',target;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=target) then
   execute format('alter publication supabase_realtime add table public.%I',target);
  end if;
 end loop;
end $$;
