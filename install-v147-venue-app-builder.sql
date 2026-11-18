begin;

create table if not exists public.local_builder_subscribers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  active_until timestamptz not null
);
create table if not exists public.local_builder_apps (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
  draft jsonb not null,
  published jsonb,
  revision integer not null default 1
);
create table if not exists public.local_builder_enquiries (
  id uuid primary key default gen_random_uuid(),
  venue_owner uuid not null references public.local_builder_apps(owner_id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  feature text not null,
  message text not null,
  created_at timestamptz not null default now()
);
create index if not exists local_builder_enquiries_venue on public.local_builder_enquiries (venue_owner, created_at desc);
create index if not exists local_builder_enquiries_sender on public.local_builder_enquiries (sender_id, created_at);
create table if not exists public.local_builder_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  calls integer not null,
  primary key (user_id, day)
);

alter table public.local_builder_subscribers enable row level security;
alter table public.local_builder_apps enable row level security;
alter table public.local_builder_enquiries enable row level security;
alter table public.local_builder_ai_usage enable row level security;
revoke all on public.local_builder_subscribers, public.local_builder_apps,
  public.local_builder_enquiries, public.local_builder_ai_usage from public, anon, authenticated;

create or replace function public.local_builder_has_access()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.local_builder_subscribers s
    where s.user_id = auth.uid() and s.active_until > now()
  )
$$;

create or replace function public.local_builder_get()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.local_builder_has_access() then return jsonb_build_object('eligible', false); end if;
  return jsonb_build_object('eligible', true, 'app', (
    select jsonb_build_object('slug', a.slug, 'draft', a.draft, 'revision', a.revision, 'published', a.published is not null)
    from public.local_builder_apps a where a.owner_id = auth.uid()
  ));
end $$;

create or replace function public.local_builder_save(p_slug text, p_draft jsonb, p_revision integer, p_publish boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare f record; c jsonb; next_revision integer;
begin
  if not public.local_builder_has_access() then raise exception 'An active venue subscription is required.'; end if;
  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) not between 3 and 60 then
    raise exception 'Choose a link name between 3 and 60 characters using letters, numbers and single hyphens.';
  end if;
  if p_publish is null or p_revision is null or p_revision < 0 or p_draft is null or
      jsonb_typeof(p_draft) is distinct from 'object' or octet_length(p_draft::text) > 32000 then
    raise exception 'Review the app details and try again.';
  end if;
  if p_draft - array['name','type','town','welcome','theme','logo','features'] <> '{}'::jsonb then
    raise exception 'Unexpected app details.';
  end if;
  for f in select * from (values ('name',90), ('type',60), ('town',90), ('welcome',700), ('theme',16), ('logo',1024)) as fields(key, max_size) loop
    if jsonb_typeof(p_draft->f.key) is distinct from 'string' or length(p_draft->>f.key) > f.max_size then
      raise exception 'One or more app details are invalid.';
    end if;
  end loop;
  if length(btrim(p_draft->>'name')) < 2 or p_draft->>'theme' not in ('emerald','burgundy','navy','charcoal')
    or (p_draft->>'logo' <> '' and p_draft->>'logo' !~ '^https://[^[:space:]]+$') then
    raise exception 'Check the venue name, theme and HTTPS logo link.';
  end if;
  if jsonb_typeof(p_draft->'features') is distinct from 'object'
    or p_draft->'features' - array['events','tickets','room','bingo','draw','rewards','gallery','games','contact'] <> '{}'::jsonb then
    raise exception 'Choose features from the venue app builder.';
  end if;
  for f in select * from jsonb_each(p_draft->'features') loop
    if jsonb_typeof(f.value) is distinct from 'array' then raise exception 'Check feature content.'; end if;
    if jsonb_array_length(f.value) > 8 then raise exception 'A feature supports up to eight cards.'; end if;
    for c in select value from jsonb_array_elements(f.value) loop
      if jsonb_typeof(c) is distinct from 'object' or c - array['title','detail','url'] <> '{}'::jsonb
        or jsonb_typeof(c->'title') is distinct from 'string' or length(btrim(c->>'title')) not between 1 and 90
        or jsonb_typeof(c->'detail') is distinct from 'string' or length(c->>'detail') > 700
        or jsonb_typeof(c->'url') is distinct from 'string' or length(c->>'url') > 1024
        or (c->>'url' <> '' and c->>'url' !~ '^https://[^[:space:]]+$') then
        raise exception 'Check card titles, text and HTTPS links.';
      end if;
    end loop;
  end loop;

  if p_publish and not exists (
    select 1 from jsonb_each(p_draft->'features') f
    where f.key in ('room','contact','games','bingo') or jsonb_array_length(f.value) > 0
  ) then raise exception 'Add at least one feature with content before publishing.'; end if;

  if p_revision = 0 then
    insert into public.local_builder_apps(owner_id, slug, draft, published)
    values (auth.uid(), p_slug, p_draft, case when p_publish then p_draft end)
    on conflict (owner_id) do nothing returning revision into next_revision;
  else
    update public.local_builder_apps a
      set draft = p_draft, published = case when p_publish then p_draft else a.published end,
          revision = a.revision + 1
      where a.owner_id = auth.uid() and a.slug = p_slug and a.revision = p_revision
      returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'This draft changed in another tab. Reload the builder before saving.'; end if;
  return next_revision;
exception when unique_violation then
  raise exception 'That public link name is already in use. Choose a different one.';
end $$;

create or replace function public.local_builder_unpublish(p_revision integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare next_revision integer;
begin
  if not public.local_builder_has_access() then raise exception 'An active venue subscription is required.'; end if;
  update public.local_builder_apps a set published = null, revision = revision + 1
    where a.owner_id = auth.uid() and a.revision = p_revision returning revision into next_revision;
  if next_revision is null then raise exception 'This draft changed in another tab. Reload the builder.'; end if;
  return next_revision;
end $$;

create or replace function public.local_builder_public(p_slug text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select a.published from public.local_builder_apps a
    join public.local_builder_subscribers s on s.user_id = a.owner_id
    where a.slug = p_slug and s.active_until > now()
$$;

create or replace function public.local_builder_enquire(p_slug text, p_feature text, p_message text)
returns void language plpgsql security definer set search_path = '' as $$
declare recipient uuid; sender uuid := auth.uid(); sender_email text := auth.jwt()->>'email';
begin
  if sender is null or coalesce(sender_email,'') = '' then raise exception 'Sign in with your email account first.'; end if;
  if p_feature is null or p_feature not in ('room','contact') or p_message is null
    or length(btrim(p_message)) not between 10 and 1000 then raise exception 'Enter a message of 10 to 1,000 characters.'; end if;
  select a.owner_id into recipient from public.local_builder_apps a join public.local_builder_subscribers s
    on s.user_id = a.owner_id where a.slug = p_slug
      and (a.published->'features') ? p_feature and s.active_until > now();
  if recipient is null then raise exception 'This venue is not accepting that enquiry.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('venue-enquiry:' || sender::text, 0));
  if (select count(*) from public.local_builder_enquiries e where e.sender_id = sender and e.created_at > now() - interval '1 day') >= 10 then
    raise exception 'You have reached today’s enquiry limit.';
  end if;
  insert into public.local_builder_enquiries(venue_owner, sender_id, email, feature, message)
    values (recipient, sender, sender_email, p_feature, btrim(p_message));
end $$;

create or replace function public.local_builder_inbox()
returns table(email text, feature text, message text, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select e.email, e.feature, e.message, e.created_at from public.local_builder_enquiries e
    where e.venue_owner = auth.uid() and public.local_builder_has_access()
    order by e.created_at desc limit 100
$$;

create or replace function public.local_builder_ai_allow()
returns boolean language plpgsql security definer set search_path = '' as $$
declare used integer;
begin
  if not public.local_builder_has_access() then return false; end if;
  insert into public.local_builder_ai_usage(user_id, day, calls)
    values (auth.uid(), (now() at time zone 'UTC')::date, 1)
  on conflict (user_id, day) do update set calls = public.local_builder_ai_usage.calls + 1
    where public.local_builder_ai_usage.calls < 12 returning calls into used;
  return used is not null;
end $$;

revoke all on function public.local_builder_has_access(), public.local_builder_get(),
  public.local_builder_save(text,jsonb,integer,boolean), public.local_builder_unpublish(integer),
  public.local_builder_public(text), public.local_builder_enquire(text,text,text),
  public.local_builder_inbox(), public.local_builder_ai_allow() from public, anon, authenticated;
grant execute on function public.local_builder_get(), public.local_builder_save(text,jsonb,integer,boolean),
  public.local_builder_unpublish(integer), public.local_builder_enquire(text,text,text),
  public.local_builder_inbox(), public.local_builder_ai_allow() to authenticated;
grant execute on function public.local_builder_public(text) to anon, authenticated;

commit;
