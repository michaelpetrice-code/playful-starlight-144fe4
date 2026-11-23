alter table public.local_dj_rooms add column if not exists ai_requests integer not null default 0;
create or replace function public.local_dj_ai_reserve(p_room uuid) returns boolean language plpgsql security invoker set search_path='' as $$declare n integer;begin
 update public.local_dj_rooms set ai_requests=ai_requests+1 where id=p_room and expires_at>now() and ai_requests<100 returning ai_requests into n;
 return n is not null;
end$$;
revoke all on function public.local_dj_ai_reserve(uuid) from public,anon,authenticated;
grant execute on function public.local_dj_ai_reserve(uuid) to service_role;
