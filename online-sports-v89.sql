-- The Local v89. Run in Supabase SQL editor, after MEMBER-GAMES-v61.sql.
-- Online darts: server-authoritative scoring and turn ownership.
-- Online cue: NOT enabled yet; physics and fouls require authoritative server simulation.
create table if not exists public.local_online_darts (
 id uuid primary key default gen_random_uuid(),
 player_one uuid not null references auth.users(id),
 player_two uuid references auth.users(id),
 status text not null default 'waiting' check (status in ('waiting','playing','finished')),
 turn_user uuid not null references auth.users(id),
 start_score integer not null default 501 check (start_score in (301,501)),
 scores integer[] not null default array[501,501],
 visits integer not null default 0,
 darts_in_visit integer not null default 0,
 visit_start integer not null default 501,
 winner uuid references auth.users(id),
 history jsonb not null default '[]'::jsonb,
 updated_at timestamptz not null default now(),
 created_at timestamptz not null default now()
);
alter table public.local_online_darts enable row level security;
drop policy if exists "Participants read darts" on public.local_online_darts;
create policy "Participants read darts" on public.local_online_darts for select to authenticated using (auth.uid()=player_one or auth.uid()=player_two);
revoke insert,update,delete on public.local_online_darts from anon,authenticated;
create or replace function public.local_darts_create(p_start integer default 501) returns uuid
language plpgsql security definer set search_path=public as $$
declare v uuid;
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 if p_start not in (301,501) then raise exception 'Invalid start score'; end if;
 insert into public.local_online_darts(player_one,turn_user,start_score,scores,visit_start)
 values(auth.uid(),auth.uid(),p_start,array[p_start,p_start],p_start) returning id into v;
 return v;
end $$;
create or replace function public.local_darts_join(p_game uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in first'; end if;
 update public.local_online_darts set player_two=auth.uid(),status='playing',updated_at=now()
 where id=p_game and status='waiting' and player_two is null and player_one<>auth.uid();
 if not found then raise exception 'Challenge unavailable'; end if;
end $$;
create or replace function public.local_darts_throw(p_game uuid,p_number integer,p_multiplier integer) returns void
language plpgsql security definer set search_path=public as $$
declare g public.local_online_darts%rowtype;slot integer;points integer;remaining integer;ns integer[];nd integer;turn_id uuid;win uuid;hist jsonb;visit integer;msg text;
begin
 select * into g from public.local_online_darts where id=p_game for update;
 if not found or g.status<>'playing' or g.turn_user<>auth.uid() then raise exception 'Not your turn';end if;
 if p_multiplier not in (1,2,3) or p_number<0 or p_number>25 or p_number between 21 and 24 or (p_number=25 and p_multiplier=3) or (p_number=0 and p_multiplier<>1) then raise exception 'Invalid dart';end if;
 points:=p_number*p_multiplier;
 slot:=case when auth.uid()=g.player_one then 1 else 2 end;
 ns:=g.scores;remaining:=ns[slot]-points;nd:=g.darts_in_visit+1;
 turn_id:=g.turn_user;win:=null;msg:='Hit '||points;
 if remaining<0 or remaining=1 or (remaining=0 and p_multiplier<>2) then
  ns[slot]:=g.visit_start;nd:=0;turn_id:=case when slot=1 then g.player_two else g.player_one end;msg:='Bust';
 elsif remaining=0 then
  ns[slot]:=0;win:=auth.uid();msg:='Checkout!';
 else
  ns[slot]:=remaining;
  if nd=3 then nd:=0;turn_id:=case when slot=1 then g.player_two else g.player_one end;end if;
 end if;
 visit:=case when nd=0 then ns[case when turn_id=g.player_one then 1 else 2 end] else g.visit_start end;
 hist:=g.history||jsonb_build_array(jsonb_build_object('player',slot,'points',points,'result',msg,'remaining',ns[slot]));
 update public.local_online_darts set scores=ns,darts_in_visit=nd,visit_start=visit,turn_user=turn_id,winner=win,
 status=case when win is not null then 'finished' else status end,
 history=(select coalesce(jsonb_agg(value),'[]'::jsonb) from (select value from jsonb_array_elements(hist) with ordinality as t(value,ord) order by ord desc limit 40) x),updated_at=now()
 where id=p_game;
end $$;
-- Realtime: enable the tables in the Supabase publication; rerunnable.
do $$ begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='local_member_games') then
   alter publication supabase_realtime add table public.local_member_games;
  end if;
  if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='local_online_darts') then
   alter publication supabase_realtime add table public.local_online_darts;
  end if;
 end if;
end $$;
revoke all on function public.local_darts_create(integer),public.local_darts_join(uuid),public.local_darts_throw(uuid,integer,integer) from public;
grant execute on function public.local_darts_create(integer),public.local_darts_join(uuid),public.local_darts_throw(uuid,integer,integer) to authenticated;
