-- The Local v39. Run in Supabase SQL Editor before publishing.
-- Existing posts, groups, group_members and pub-photos policies remain in place.
create table if not exists public.local_member_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 avatar_url text,
 updated_at timestamptz not null default now()
);
alter table public.local_member_profiles enable row level security;
create policy "Member photos visible to signed in members" on public.local_member_profiles for select to authenticated using(true);
create policy "Members insert own profile" on public.local_member_profiles for insert to authenticated with check(user_id=auth.uid());
create policy "Members update own profile" on public.local_member_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('local-avatars','local-avatars',true,1048576,array['image/jpeg']) on conflict(id) do update set public=true;
create policy "Users upload own avatar" on storage.objects for insert to authenticated with check(bucket_id='local-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Users delete own avatar" on storage.objects for delete to authenticated using(bucket_id='local-avatars' and (storage.foldername(name))[1]=auth.uid()::text);
create table if not exists public.local_table_games(
 id uuid primary key default gen_random_uuid(),
 table_id text not null,group_id uuid not null references public.groups(id) on delete cascade,
 game_type text not null check(game_type in ('ttt','connect4')),
 player_one uuid not null references auth.users(id),player_two uuid references auth.users(id),
 turn_user uuid not null references auth.users(id),
 board jsonb not null, status text not null default 'waiting' check(status in ('waiting','playing','finished')),
 winner uuid references auth.users(id),revision integer not null default 0,
 created_at timestamptz not null default now()
);
alter table public.local_table_games enable row level security;
-- Group membership is checked using the existing group_members table.
create policy "Members can view community games" on public.local_table_games for select to authenticated using(public.is_group_member(local_table_games.group_id));
create policy "Members can start community games" on public.local_table_games for insert to authenticated with check(player_one=auth.uid() and turn_user=auth.uid() and player_two is null and status='waiting' and board=case when game_type='connect4' then ('["' || repeat('","',41) || '"]')::jsonb else ('["' || repeat('","',8) || '"]')::jsonb end and public.is_group_member(local_table_games.group_id));
-- No direct UPDATE grants/policies: game moves are validated atomically by server RPCs.
create or replace function public.local_join_game(p_game uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 update public.local_table_games set player_two=auth.uid(),status='playing',revision=revision+1 where id=p_game and status='waiting' and player_two is null and player_one<>auth.uid() and public.is_group_member(local_table_games.group_id);
 if not found then raise exception 'This game is not available to join';end if;
end $$;
create or replace function public.local_play_move(p_game uuid,p_cell int) returns void language plpgsql security definer set search_path=public as $$
declare g public.local_table_games%rowtype; b jsonb; sym text; pos int; col int; r int; k int; dr int; dc int; rr int; cc int; won boolean:=false; finished boolean:=false;
begin
 select * into g from public.local_table_games where id=p_game for update;
 if not found or g.status<>'playing' or g.turn_user<>auth.uid() or auth.uid() not in (g.player_one,g.player_two) then raise exception 'Not your turn or game unavailable';end if;
 if not public.is_group_member(g.group_id) then raise exception 'Not a community member';end if;
 sym:=case when g.player_one=auth.uid() then case when g.game_type='connect4' then 'R' else 'X' end else case when g.game_type='connect4' then 'Y' else 'O' end end;
 b:=g.board;
 if g.game_type='ttt' then
  if p_cell<0 or p_cell>8 or b->>p_cell<>'' then raise exception 'Invalid square';end if;
  pos:=p_cell;b:=jsonb_set(b,array[pos::text],to_jsonb(sym));
  won:=((b->>0=sym and b->>1=sym and b->>2=sym) or (b->>3=sym and b->>4=sym and b->>5=sym) or (b->>6=sym and b->>7=sym and b->>8=sym) or (b->>0=sym and b->>3=sym and b->>6=sym) or (b->>1=sym and b->>4=sym and b->>7=sym) or (b->>2=sym and b->>5=sym and b->>8=sym) or (b->>0=sym and b->>4=sym and b->>8=sym) or (b->>2=sym and b->>4=sym and b->>6=sym));
 else
  if p_cell<0 or p_cell>41 then raise exception 'Invalid square';end if;
  col:=p_cell%7;pos:=-1;
  for r in reverse 5..0 loop if b->>(r*7+col)='' then pos:=r*7+col;exit;end if;end loop;
  if pos<0 then raise exception 'Column full';end if;
  b:=jsonb_set(b,array[pos::text],to_jsonb(sym));
  for dr in 0..1 loop for dc in -1..1 loop
   if not(dr=0 and dc<>1) and not(dr=0 and dc=0) then
    for r in 0..5 loop for col in 0..6 loop
     if b->>(r*7+col)=sym then
      finished:=true;
      for k in 1..3 loop rr:=r+dr*k;cc:=col+dc*k;if rr<0 or rr>5 or cc<0 or cc>6 or b->>(rr*7+cc)<>sym then finished:=false;exit;end if;end loop;
      if finished then won:=true;exit;end if;
     end if;
    end loop;exit when won;end loop;
   end if;
   exit when won;
  end loop;exit when won;end loop;
 end if;
 finished:=won or not exists(select 1 from jsonb_array_elements_text(b) x where x.value='');
 update public.local_table_games set board=b,status=case when finished then 'finished' else 'playing' end,winner=case when won then auth.uid() else null end,turn_user=case when g.player_one=auth.uid() then g.player_two else g.player_one end,revision=g.revision+1 where id=p_game;
end $$;
create or replace function public.local_end_game(p_game uuid) returns void language plpgsql security definer set search_path=public as $$
begin
 update public.local_table_games set status='finished' where id=p_game and player_one=auth.uid();
 if not found then raise exception 'Only the game host can end it';end if;
end $$;
revoke all on function public.local_join_game(uuid) from public;
revoke all on function public.local_play_move(uuid,int) from public;
revoke all on function public.local_end_game(uuid) from public;
grant execute on function public.local_join_game(uuid),public.local_play_move(uuid,int),public.local_end_game(uuid) to authenticated;
-- Enable realtime for game updates.
do $$ begin alter publication supabase_realtime add table public.local_table_games; exception when duplicate_object then null; end $$;
