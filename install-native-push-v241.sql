-- Web push: device subscriptions are private to their signed-in member.
create schema if not exists local_push_private;
revoke all on schema local_push_private from public,anon,authenticated;
create table public.local_push_subscriptions (
 endpoint text primary key check(length(endpoint)<=2048),
 user_id uuid not null references auth.users(id) on delete cascade,
 subscription jsonb not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index local_push_subscriptions_member on public.local_push_subscriptions(user_id);
create table public.local_push_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 muted_tables uuid[] not null default '{}'
);
create table public.local_push_jobs (
 id uuid primary key default gen_random_uuid(),
 source text not null check(source in ('tl_table_posts','private_chat_messages','market_messages','local_member_notices')),
 message_id uuid not null,
 status text not null default 'pending' check(status in ('pending','working','done','failed')),
 attempts integer not null default 0,
 available_at timestamptz not null default now(),
 lease_until timestamptz,
 last_error text,
 created_at timestamptz not null default now(),
 unique(source,message_id)
);
create index local_push_jobs_due on public.local_push_jobs(available_at) where status in ('pending','working');
create table public.local_push_deliveries (
 job_id uuid not null references public.local_push_jobs(id) on delete cascade,
 endpoint_hash text not null,
 delivered_at timestamptz not null default now(),
 primary key(job_id,endpoint_hash)
);
alter table public.local_push_subscriptions enable row level security;
alter table public.local_push_preferences enable row level security;
alter table public.local_push_jobs enable row level security;
alter table public.local_push_deliveries enable row level security;
revoke all on public.local_push_subscriptions,public.local_push_preferences,public.local_push_jobs,public.local_push_deliveries from public,anon,authenticated;
grant select on public.local_push_subscriptions,public.local_push_preferences to authenticated;
grant all on public.local_push_subscriptions,public.local_push_preferences,public.local_push_jobs,public.local_push_deliveries to service_role;
create policy "Members read own push devices" on public.local_push_subscriptions for select to authenticated using(user_id=(select auth.uid()));
create policy "Members read own push choices" on public.local_push_preferences for select to authenticated using(user_id=(select auth.uid()));
-- Only this narrow service-role RPC can read the dedicated push secrets.
create function public.local_push_server_config() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_object_agg(name,decrypted_secret),'{}'::jsonb) from vault.decrypted_secrets
 where name in ('local_push_vapid_public','local_push_vapid_private','local_push_webhook_secret');
$$;
revoke all on function public.local_push_server_config() from public,anon,authenticated;
grant execute on function public.local_push_server_config() to service_role;
create function public.local_push_claim_jobs() returns setof public.local_push_jobs language sql set search_path='' as $$
 update public.local_push_jobs set status='failed',last_error='Delivery lease expired after maximum attempts' where status='working' and lease_until<now() and attempts>=5;
 update public.local_push_jobs j set status='working',attempts=attempts+1,lease_until=now()+interval '5 minutes'
 where j.id in (select q.id from public.local_push_jobs q where q.attempts<5 and q.available_at<=now() and
 (q.status='pending' or (q.status='working' and q.lease_until<now())) order by q.created_at limit 5 for update skip locked)
 returning j.*;
$$;
revoke all on function public.local_push_claim_jobs() from public,anon,authenticated;
grant execute on function public.local_push_claim_jobs() to service_role;
create function local_push_private.wake() returns bigint language plpgsql security definer set search_path='' as $$
 declare secret text; request_id bigint;
 begin
  if not exists(select 1 from public.local_push_jobs where status in ('pending','working') and available_at<=now()) then return null;end if;
  select decrypted_secret into secret from vault.decrypted_secrets where name='local_push_webhook_secret';
  if secret is null then return null;end if;
  select net.http_post(url:='https://huuqwjmztqurnyyokrxd.supabase.co/functions/v1/member-push?action=dispatch',
    body:='{}'::jsonb,headers:=jsonb_build_object('Content-Type','application/json','x-local-push-secret',secret),timeout_milliseconds:=10000) into request_id;
  return request_id;
 end;
$$;
revoke all on function local_push_private.wake() from public,anon,authenticated;
create function local_push_private.enqueue() returns trigger language plpgsql security definer set search_path='' as $$
 begin
  insert into public.local_push_jobs(source,message_id) values(TG_TABLE_NAME,NEW.id) on conflict(source,message_id) do nothing;
  begin perform local_push_private.wake();exception when others then null;end;
  return NEW;
 end;
$$;
revoke all on function local_push_private.enqueue() from public,anon,authenticated;
create trigger local_push_table_message after insert on public.tl_table_posts for each row when (new.hidden=false) execute function local_push_private.enqueue();
create trigger local_push_private_message after insert on public.private_chat_messages for each row execute function local_push_private.enqueue();
create trigger local_push_market_message after insert on public.market_messages for each row execute function local_push_private.enqueue();
create trigger local_push_member_notice after insert on public.local_member_notices for each row execute function local_push_private.enqueue();
create policy "Push worker manages queued jobs" on public.local_push_jobs for all to service_role using (true) with check (true);
create policy "Push worker manages delivery receipts" on public.local_push_deliveries for all to service_role using (true) with check (true);

-- Retry queued deliveries without making HTTP calls when the queue is empty.
select cron.schedule('the-local-message-push','* * * * *',$job$select local_push_private.wake();$job$);
