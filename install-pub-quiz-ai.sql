begin;
create table if not exists public.local_quiz_ai_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  calls integer not null,
  primary key (user_id, day)
);
alter table public.local_quiz_ai_usage enable row level security;
revoke all on public.local_quiz_ai_usage from public, anon, authenticated;

create or replace function public.local_quiz_reserve_ai(p_user uuid, p_venue uuid)
returns boolean language plpgsql security definer set search_path='' as $$
begin
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  if p_venue is null then
    if not public.local_quiz_party_complimentary() and public.local_quiz_party_balance() < 1 then return false; end if;
  elsif public.local_quiz_host_access(p_venue) not in ('paid','complimentary') then
    return false;
  end if;
  insert into public.local_quiz_ai_usage values
    (p_user, timezone('Europe/London', now())::date, 1)
  on conflict (user_id, day) do update set calls = local_quiz_ai_usage.calls + 1
  where local_quiz_ai_usage.calls < 5;
  return found;
end $$;
revoke all on function public.local_quiz_reserve_ai(uuid,uuid) from public, anon, authenticated;
grant execute on function public.local_quiz_reserve_ai(uuid,uuid) to service_role;
commit;
