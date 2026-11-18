-- The Local v61: secure member-to-member online challenges.
-- Run once in the SAME Supabase project as The Local. Existing data is retained.
create table if not exists public.local_member_games (
 id uuid primary key default gen_random_uuid(), game_type text not null check(game_type in ('ttt','connect4')),
 player_one uuid not null references auth.users(id),player_two uuid references auth.users(id),
 turn_user uuid not null references auth.users(id),board jsonb not null,
 status text not null default 'waiting' check(status in ('waiting','playing','finished')),
 winner uuid references auth.users(id),created_at timestamptz not null default now()
);
alter table public.local_member_games enable row level security;
-- Invitation holders can read the match by UUID, but no public or anonymous access.
drop policy if exists "Signed-in members can see invited matches" on public.local_member_games;
create policy "Signed-in members can see invited matches" on public.local_member_games for select to authenticated using(true);
revoke insert,update,delete on public.local_member_games from anon,authenticated;
create or replace function public.local_member_create(p_type text) returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid; b jsonb;
begin
 if auth.uid() is null then raise exception 'Sign in to play'; end if;
 if p_type not in ('ttt','connect4') then raise exception 'Unknown game'; end if;
 select jsonb_agg(''::text) into b from generate_series(1,case when p_type='ttt' then 9 else 42 end);
 insert into public.local_member_games(game_type,player_one,turn_user,board) values(p_type,auth.uid(),auth.uid(),b) returning id into new_id;
 return new_id;
end $$;
create or replace function public.local_member_join(p_game uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in to play'; end if;
 update public.local_member_games set player_two=auth.uid(),status='playing' where id=p_game and status='waiting' and player_two is null and player_one<>auth.uid();
 if not found then raise exception 'This challenge cannot be joined'; end if;
end $$;
create or replace function public.local_member_move(p_game uuid,p_cell integer) returns void language plpgsql security definer set search_path=public as $$
declare g public.local_member_games%rowtype;b jsonb;sym text;pos integer;col integer;r integer;dr integer;dc integer;k integer;rr integer;cc integer;ok boolean;won boolean:=false;finished boolean;
begin
 select * into g from public.local_member_games where id=p_game for update;
 if not found or g.status<>'playing' or g.turn_user<>auth.uid() or auth.uid() not in (g.player_one,g.player_two) then raise exception 'Not your turn';end if;
 sym:=case when g.player_one=auth.uid() then case when g.game_type='connect4' then 'R' else 'X' end else case when g.game_type='connect4' then 'Y' else 'O' end end;
 b:=g.board;
 if g.game_type='ttt' then
  if p_cell<0 or p_cell>8 or b->>p_cell<>'' then raise exception 'Square unavailable';end if;
  b:=jsonb_set(b,array[p_cell::text],to_jsonb(sym));
  won:=((b->>0=sym and b->>1=sym and b->>2=sym) or (b->>3=sym and b->>4=sym and b->>5=sym) or (b->>6=sym and b->>7=sym and b->>8=sym) or (b->>0=sym and b->>3=sym and b->>6=sym) or (b->>1=sym and b->>4=sym and b->>7=sym) or (b->>2=sym and b->>5=sym and b->>8=sym) or (b->>0=sym and b->>4=sym and b->>8=sym) or (b->>2=sym and b->>4=sym and b->>6=sym));
 else
  if p_cell<0 or p_cell>41 then raise exception 'Invalid column';end if;
  col:=p_cell%7;pos:=-1;
  for r in reverse 5..0 loop if b->>(r*7+col)='' then pos:=r*7+col;exit;end if;end loop;
  if pos<0 then raise exception 'Column full';end if;
  b:=jsonb_set(b,array[pos::text],to_jsonb(sym));
  for dr in -1..1 loop
   for dc in -1..1 loop
    if dr=0 and dc=0 then continue;end if;
    for r in 0..5 loop
     for col in 0..6 loop
      if b->>(r*7+col)<>sym then continue;end if;
      ok:=true;
      for k in 1..3 loop rr:=r+dr*k;cc:=col+dc*k;if rr<0 or rr>5 or cc<0 or cc>6 or b->>(rr*7+cc)<>sym then ok:=false;exit;end if;end loop;
      if ok then won:=true;exit;end if;
     end loop;
     exit when won;
    end loop;
    exit when won;
   end loop;
   exit when won;
  end loop;
 end if;
 select won or not exists(select 1 from jsonb_array_elements_text(b) x where x.value='') into finished;
 update public.local_member_games set board=b,status=case when finished then 'finished' else 'playing' end,winner=case when won then auth.uid() else null end,turn_user=case when g.player_one=auth.uid() then g.player_two else g.player_one end where id=p_game;
end $$;
revoke all on function public.local_member_create(text) from public;
revoke all on function public.local_member_join(uuid) from public;
revoke all on function public.local_member_move(uuid,integer) from public;
grant execute on function public.local_member_create(text),public.local_member_join(uuid),public.local_member_move(uuid,integer) to authenticated;
