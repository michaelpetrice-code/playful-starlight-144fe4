begin;
create table public.local_quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.local_venue_directory(id) on delete cascade,
  host_id uuid not null,
  code text unique not null default upper(left(replace(gen_random_uuid()::text, '-', ''), 10)),
  title text not null,
  questions jsonb not null,
  current_question integer not null default 0,
  phase text not null default 'lobby' check (phase in ('lobby','open','reveal','finished')),
  created_at timestamptz not null default now()
);
create table public.local_quiz_teams (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.local_quiz_sessions(id) on delete cascade,
  captain_id uuid not null,
  name text not null,
  unique(session_id, captain_id)
);
create unique index local_quiz_team_name on public.local_quiz_teams(session_id, lower(name));
create table public.local_quiz_answers (
  team_id uuid not null references public.local_quiz_teams(id) on delete cascade,
  question integer not null,
  choice integer not null check(choice between 0 and 3),
  primary key(team_id, question)
);
alter table public.local_quiz_sessions enable row level security;
alter table public.local_quiz_teams enable row level security;
alter table public.local_quiz_answers enable row level security;
revoke all on public.local_quiz_sessions, public.local_quiz_teams, public.local_quiz_answers from public, anon, authenticated;

-- Coombe's existing directory ID and owner account are verified before enabling the pilot.
create table public.local_quiz_coombe_hosts (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.local_quiz_coombe_hosts enable row level security;
revoke all on public.local_quiz_coombe_hosts from public, anon, authenticated;
insert into public.local_quiz_coombe_hosts(user_id)
select id from auth.users
where lower(email) = 'michaelpetrice@gmail.com' and email_confirmed_at is not null;

-- Operators may register a verified owner for an approved venue without an App Builder.
create table public.local_quiz_venue_owners (
  venue_id uuid primary key references public.local_venue_directory(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade
);
create table public.local_quiz_subscriptions (
  id text primary key,
  venue_id uuid not null references public.local_venue_directory(id) on delete cascade,
  purchaser_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('standard','subscriber')),
  status text not null,
  active_until timestamptz,
  live boolean not null,
  observed_at timestamptz not null
);
create index local_quiz_subscriptions_venue on public.local_quiz_subscriptions(venue_id);
alter table public.local_quiz_venue_owners enable row level security;
alter table public.local_quiz_subscriptions enable row level security;
revoke all on public.local_quiz_venue_owners, public.local_quiz_subscriptions from public, anon, authenticated;

create function public.local_quiz_record_subscription(
  p_id text, p_venue uuid, p_purchaser uuid, p_tier text, p_status text,
  p_until timestamptz, p_live boolean, p_observed timestamptz
) returns void language sql security definer set search_path = '' as $$
  insert into public.local_quiz_subscriptions(id,venue_id,purchaser_id,tier,status,active_until,live,observed_at)
  values(p_id,p_venue,p_purchaser,p_tier,p_status,p_until,p_live,p_observed)
  on conflict(id) do update set status=excluded.status,active_until=excluded.active_until,
    observed_at=excluded.observed_at
  where local_quiz_subscriptions.observed_at <= excluded.observed_at
    and local_quiz_subscriptions.venue_id = excluded.venue_id
    and local_quiz_subscriptions.purchaser_id = excluded.purchaser_id
    and local_quiz_subscriptions.live = excluded.live
$$;
revoke all on function public.local_quiz_record_subscription(text,uuid,uuid,text,text,timestamptz,boolean,timestamptz)
from public, anon, authenticated;
grant execute on function public.local_quiz_record_subscription(text,uuid,uuid,text,text,timestamptz,boolean,timestamptz)
to service_role;

create function public.local_quiz_venues()
returns table(id uuid, name text, entitlement text, tier text, multimedia boolean, can_buy boolean)
language sql stable security definer set search_path = '' as $$
  with managed as (
    select v.id, v.name, coalesce(a.owner_id, registered.user_id) as owner_id,
      v.id = '65da0d42-64b0-47a7-852c-997c1ea03b18' as coombe
    from public.local_venue_directory v
    left join public.local_builder_apps a on a.slug = v.builder_app_slug
    left join public.local_quiz_venue_owners registered on registered.venue_id = v.id
    where v.status in ('approved','featured')
  ), eligibility as (
    select m.*, exists (
      select 1 from public.local_billing_subscriptions b where b.user_id = m.owner_id
        and b.live and b.status = 'active' and b.active_until > now()
    ) as venue_paid
    from managed m where auth.uid() is not null and case when coombe
      then exists (select 1 from public.local_quiz_coombe_hosts h where h.user_id = auth.uid())
      else m.owner_id = auth.uid() or m.owner_id = public.local_builder_effective_owner() end
  ), access as (
    select e.*, exists (
      select 1 from public.local_quiz_subscriptions q where q.venue_id = e.id
        and q.purchaser_id = e.owner_id and q.live and q.status = 'active'
        and q.active_until > now() and (q.tier = 'standard' or e.venue_paid)
    ) as quiz_paid
    from eligibility e
  )
  select a.id,a.name,
    case when coombe then 'complimentary' when venue_paid or quiz_paid then 'paid' else 'subscription_required' end,
    case when venue_paid then 'subscriber' else 'standard' end,
    coombe or quiz_paid,
    not coombe and not quiz_paid and owner_id = auth.uid() and not exists (
      select 1 from public.local_quiz_subscriptions q where q.venue_id = a.id
        and q.purchaser_id = a.owner_id and q.live and q.status = 'active' and q.active_until > now()
    )
  from access a order by a.name
$$;

create table public.local_quiz_checkout_leases (
  venue_id uuid primary key references public.local_venue_directory(id) on delete cascade,
  purchaser_id uuid not null,
  key uuid not null,
  expires_at bigint not null
);
alter table public.local_quiz_checkout_leases enable row level security;
revoke all on public.local_quiz_checkout_leases from public, anon, authenticated;

create function public.local_quiz_checkout_lease(p_venue uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare lease public.local_quiz_checkout_leases; expiry bigint;
begin
  if not exists(select 1 from public.local_quiz_venues() where id=p_venue and can_buy) then
    raise exception 'Only the verified venue owner can purchase';
  end if;
  expiry := floor(extract(epoch from clock_timestamp())) + 3660;
  insert into public.local_quiz_checkout_leases values(p_venue,auth.uid(),gen_random_uuid(),expiry)
  on conflict(venue_id) do update set
    key = excluded.key, expires_at = excluded.expires_at, purchaser_id = excluded.purchaser_id
  where local_quiz_checkout_leases.expires_at <= expiry - 3660
  returning * into lease;
  if not found then select * into lease from public.local_quiz_checkout_leases where venue_id=p_venue; end if;
  if lease.purchaser_id <> auth.uid() then raise exception 'A checkout is already open for this venue'; end if;
  return jsonb_build_object('key',lease.key,'expires_at',lease.expires_at);
end $$;
revoke all on function public.local_quiz_checkout_lease(uuid) from public,anon,authenticated;
grant execute on function public.local_quiz_checkout_lease(uuid) to authenticated;

create function public.local_quiz_host_access(p_venue uuid)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select entitlement from public.local_quiz_venues() where id = p_venue), 'denied')
$$;

create function public.local_quiz_media_access(p_venue uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select multimedia from public.local_quiz_venues() where id = p_venue), false)
$$;

create function public.local_quiz_create(p_venue uuid, p_title text, p_questions jsonb)
returns text language plpgsql security definer set search_path = '' as $$
declare question jsonb; join_code text;
begin
  if public.local_quiz_host_access(p_venue) not in ('paid','complimentary') then
    raise exception 'An eligible registered venue is required to host';
  end if;
  if coalesce(length(trim(p_title)),0) not between 1 and 80
    or jsonb_typeof(p_questions) is distinct from 'array' then raise exception 'Invalid quiz'; end if;
  if jsonb_array_length(p_questions) not between 1 and 60 then raise exception 'Add 1 to 60 questions'; end if;
  for question in select value from jsonb_array_elements(p_questions) loop
    if question ? 'media' then
      if not public.local_quiz_media_access(p_venue) then
        raise exception 'This venue needs the quiz multimedia add-on';
      end if;
      if jsonb_typeof(question->'media') is distinct from 'object'
        or coalesce(question->'media'->>'kind','') not in ('image','video')
        or coalesce(question->'media'->>'url','') !~ '^https://[^[:space:]]+$'
        or length(question->'media'->>'url') > 2048
        or (question->'media'->>'kind' = 'image' and coalesce(length(trim(question->'media'->>'alt')),0) not between 1 and 200)
      then raise exception 'Use an HTTPS media link and describe any image'; end if;
    end if;
    if coalesce(length(trim(question->>'prompt')),0) not between 1 and 240
      or jsonb_typeof(question->'options') is distinct from 'array'
      or coalesce(question->>'correct','') !~ '^[0-3]$' then raise exception 'Invalid question'; end if;
    if (question ? 'round' or question ? 'topic') and (
      coalesce(question->>'round', '') !~ '^([1-9]|1[0-9]|20)$'
      or jsonb_typeof(question->'topic') is distinct from 'string'
      or coalesce(length(trim(question->>'topic')), 0) not between 1 and 60
    ) then raise exception 'Invalid round number or topic'; end if;
    if jsonb_array_length(question->'options') <> 4 or exists (
      select 1 from jsonb_array_elements(question->'options') option
      where jsonb_typeof(option) <> 'string' or length(trim(option #>> '{}')) not between 1 and 120
    ) then raise exception 'Each question requires four answer options'; end if;
  end loop;
  insert into public.local_quiz_sessions(venue_id,host_id,title,questions)
  values(p_venue,auth.uid(),trim(p_title),p_questions) returning code into join_code;
  return join_code;
end $$;

create function public.local_quiz_room(p_code text, p_action text default 'view',
  p_name text default null, p_question integer default null, p_choice integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  room public.local_quiz_sessions;
  team public.local_quiz_teams;
  mine boolean;
  prompt jsonb;
  scores jsonb;
  selected integer;
begin
  if auth.uid() is null then raise exception 'Sign in to join the quiz'; end if;
  select * into room from public.local_quiz_sessions where code = upper(trim(p_code));
  if not found then raise exception 'Quiz code not found'; end if;
  if p_action <> 'view' then
    select * into room from public.local_quiz_sessions where id = room.id for update;
  end if;
  mine := room.host_id = auth.uid() and public.local_quiz_host_access(room.venue_id) in ('paid','complimentary');
  select * into team from public.local_quiz_teams where session_id=room.id and captain_id=auth.uid();

  case p_action
    when 'view' then null;
    when 'join' then
      if room.phase <> 'lobby' or mine or coalesce(length(trim(p_name)),0) not between 2 and 40 then
        raise exception 'Teams can register in the lobby with a name of 2 to 40 characters';
      end if;
      if team.id is null then
        if (select count(*) from public.local_quiz_teams where session_id=room.id) >= 100 then
          raise exception 'This quiz has reached its team limit';
        end if;
        insert into public.local_quiz_teams(session_id,captain_id,name)
        values(room.id,auth.uid(),trim(p_name)) returning * into team;
      end if;
    when 'answer' then
      if team.id is null or room.phase <> 'open' or p_question is distinct from room.current_question
        or p_choice is null or p_choice not between 0 and 3 then raise exception 'This answer window is closed'; end if;
      insert into public.local_quiz_answers(team_id,question,choice)
      values(team.id,p_question,p_choice) on conflict do nothing;
    when 'advance' then
      if not mine then raise exception 'Only the eligible quiz host can advance'; end if;
      if room.phase = 'lobby' and not exists (select 1 from public.local_quiz_teams where session_id=room.id) then
        raise exception 'Wait for at least one team to join';
      end if;
      if p_question is distinct from room.current_question or p_name is distinct from room.phase then
        raise exception 'The quiz has already moved on';
      end if;
      update public.local_quiz_sessions set
        phase=case phase when 'lobby' then 'open' when 'open' then 'reveal'
          when 'reveal' then case when current_question+1 < jsonb_array_length(questions) then 'open' else 'finished' end
          else 'finished' end,
        current_question=current_question + case when phase='reveal'
          and current_question+1 < jsonb_array_length(questions) then 1 else 0 end
      where id=room.id returning * into room;
    else raise exception 'Unknown quiz action';
  end case;

  if room.phase in ('open','reveal') and (mine or team.id is not null) then
    prompt := room.questions->room.current_question;
  end if;
  if team.id is not null then
    select choice into selected from public.local_quiz_answers
    where team_id=team.id and question=room.current_question;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('name', name, 'points', points) order by points desc,name),'[]'::jsonb)
  into scores from (
    select t.name, count(a.team_id) as points
    from public.local_quiz_teams t left join public.local_quiz_answers a
      on a.team_id=t.id
      and (room.phase in ('reveal','finished') or a.question < room.current_question)
      and a.choice=(room.questions->a.question->>'correct')::integer
    where t.session_id=room.id group by t.id
  ) ranking;

  return jsonb_build_object('title', room.title, 'code', room.code, 'phase', room.phase,
    'host', mine, 'team', team.name, 'position', room.current_question,
    'total', jsonb_array_length(room.questions), 'selected', selected,
    'prompt', prompt->>'prompt', 'options', prompt->'options',
    'round', prompt->'round', 'topic', prompt->>'topic', 'media', prompt->'media',
    'correct', case when room.phase='reveal' then prompt->'correct' end, 'scores', scores);
end $$;

revoke all on function public.local_quiz_venues(), public.local_quiz_host_access(uuid), public.local_quiz_media_access(uuid),
  public.local_quiz_create(uuid,text,jsonb), public.local_quiz_room(text,text,text,integer,integer)
from public, anon, authenticated;
grant execute on function public.local_quiz_venues(), public.local_quiz_host_access(uuid), public.local_quiz_media_access(uuid),
  public.local_quiz_create(uuid,text,jsonb), public.local_quiz_room(text,text,text,integer,integer)
to authenticated;
commit;
