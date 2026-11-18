begin;
create table if not exists public.local_billing_customers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 customer_id text not null unique,
 lease uuid, lease_until timestamptz
);
create table if not exists public.local_billing_subscriptions (
 id text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 status text not null, event_at bigint not null, live boolean not null, active_until timestamptz
);
create index if not exists local_billing_subscriptions_user on public.local_billing_subscriptions(user_id);
alter table public.local_billing_customers enable row level security;
alter table public.local_billing_subscriptions enable row level security;
revoke all on public.local_billing_customers, public.local_billing_subscriptions from public, anon, authenticated;
grant select, insert, update on public.local_billing_customers to service_role;

create or replace function public.local_reserve_billing_checkout(p_user uuid,p_lease uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 update public.local_billing_customers set lease=p_lease, lease_until=now()+interval '32 minutes'
 where user_id=p_user and (lease_until is null or lease_until < now());
 return found;
end $$;

create or replace function public.local_release_billing_checkout(p_user uuid,p_lease uuid)
returns void language sql security definer set search_path='' as $$
 update public.local_billing_customers set lease=null,lease_until=null where user_id=p_user and lease=p_lease
$$;

create or replace function public.local_record_billing_subscription(p_id text,p_user uuid,p_status text,p_event_at bigint,p_live boolean,p_until timestamptz)
returns void language sql security definer set search_path='' as $$
 insert into public.local_billing_subscriptions(id,user_id,status,event_at,live,active_until)
 values(p_id,p_user,p_status,p_event_at,p_live,p_until)
 on conflict(id) do update set status=excluded.status,event_at=excluded.event_at,active_until=excluded.active_until
 where local_billing_subscriptions.user_id=excluded.user_id and local_billing_subscriptions.live=excluded.live
   and local_billing_subscriptions.event_at <= excluded.event_at
$$;

create or replace function public.local_builder_account_active(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.local_builder_subscribers s where s.user_id=p_user and s.active_until>now())
     or exists(select 1 from public.local_billing_subscriptions s where s.user_id=p_user and s.active_until>now())
$$;
create or replace function public.local_builder_has_access()
returns boolean language sql stable security definer set search_path='' as $$
 select public.local_builder_account_active(auth.uid())
$$;
create or replace function public.local_billing_status()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
   'eligible',public.local_builder_has_access(),
   'customer',exists(select 1 from public.local_billing_customers c where c.user_id=auth.uid()),
   'subscribed',exists(select 1 from public.local_billing_subscriptions s where s.user_id=auth.uid()
     and s.status not in ('canceled','incomplete_expired'))
 )
$$;
revoke all on function public.local_reserve_billing_checkout(uuid,uuid),
 public.local_release_billing_checkout(uuid,uuid),public.local_record_billing_subscription(text,uuid,text,bigint,boolean,timestamptz),
 public.local_builder_account_active(uuid),public.local_billing_status() from public,anon,authenticated;
grant execute on function public.local_reserve_billing_checkout(uuid,uuid),public.local_release_billing_checkout(uuid,uuid),
 public.local_record_billing_subscription(text,uuid,text,bigint,boolean,timestamptz) to service_role;
grant execute on function public.local_billing_status() to authenticated;
create or replace function public.local_builder_public(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select a.published from public.local_builder_apps a
    where a.slug = p_slug and public.local_builder_account_active(a.owner_id)
$$;

create or replace function public.local_builder_enquire(p_slug text, p_feature text, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare recipient uuid; sender uuid := auth.uid(); sender_email text := auth.jwt()->>'email';
begin
  if sender is null or coalesce(sender_email,'') = '' then raise exception 'Sign in with your email account first.'; end if;
  if p_feature is null or p_feature not in ('room','contact') or p_message is null
    or length(btrim(p_message)) not between 10 and 1000 then raise exception 'Enter a message of 10 to 1,000 characters.'; end if;
  select a.owner_id into recipient from public.local_builder_apps a where a.slug = p_slug
      and (a.published->'features') ? p_feature and public.local_builder_account_active(a.owner_id);
  if recipient is null then raise exception 'This venue is not accepting that enquiry.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('venue-enquiry:' || sender::text, 0));
  if (select count(*) from public.local_builder_enquiries e where e.sender_id = sender and e.created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have reached today’s enquiry limit.';
  end if;
  insert into public.local_builder_enquiries(venue_owner, sender_id, email, feature, message)
    values (recipient, sender, sender_email, p_feature, btrim(p_message));
end $$;


commit;
