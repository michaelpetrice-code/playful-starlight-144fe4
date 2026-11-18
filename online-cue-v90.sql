-- v90: Server-simulated cue matches. Run after v89 SQL.
-- The client supplies ONLY aim and power. Server computes every settled position and foul.
create table if not exists public.local_cue_matches (
 id uuid primary key default gen_random_uuid(),
 kind text not null check(kind in ('pool','snooker')),
 player_one uuid not null references auth.users(id), player_two uuid references auth.users(id),
 turn_user uuid not null references auth.users(id), status text not null default 'waiting' check(status in ('waiting','playing','finished')),
 state jsonb not null default '{}'::jsonb, version integer not null default 0,
 winner uuid references auth.users(id), history jsonb not null default '[]'::jsonb,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.local_cue_matches enable row level security;
drop policy if exists "Cue participants read" on public.local_cue_matches;
create policy "Cue participants read" on public.local_cue_matches for select to authenticated using(auth.uid()=player_one or auth.uid()=player_two);
revoke all on public.local_cue_matches from anon,authenticated;
grant select on public.local_cue_matches to authenticated;
-- No client insert/update/delete privileges. All mutations go through locked RPCs.
create or replace function public.local_cue_create(p_kind text) returns uuid
language plpgsql security definer set search_path=public as $$
declare uid uuid:=auth.uid(); gid uuid; b jsonb:='[]'::jsonb; i integer; rownum integer; colnum integer; n integer; xx float8; yy float8;
begin
 if uid is null then raise exception 'Sign in first';end if;
 if p_kind not in ('pool','snooker') then raise exception 'Invalid game';end if;
 b:=b||jsonb_build_array(jsonb_build_object('n',0,'x',225,'y',240,'live',true));
 if p_kind='pool' then
  for i in 1..15 loop
   rownum:=floor((sqrt(8*(i-1)+1)-1)/2)::int;colnum:=i-1-rownum*(rownum+1)/2;
   xx:=635+rownum*25;yy:=240+(colnum-rownum/2.0)*27;
   b:=b||jsonb_build_array(jsonb_build_object('n',i,'x',xx,'y',yy,'live',true));
  end loop;
 else
  for i in 1..15 loop
   rownum:=floor((sqrt(8*(i-1)+1)-1)/2)::int;colnum:=i-1-rownum*(rownum+1)/2;
   b:=b||jsonb_build_array(jsonb_build_object('n',1,'x',615+rownum*22,'y',240+(colnum-rownum/2.0)*24,'live',true));
  end loop;
  for i in 2..7 loop
   b:=b||jsonb_build_array(jsonb_build_object('n',i,'x',330+(i-2)*47,'y',case when i%2=0 then 195 else 285 end,'live',true));
  end loop;
 end if;
 insert into public.local_cue_matches(kind,player_one,turn_user,state)
 values(p_kind,uid,uid,jsonb_build_object('balls',b,'scores',jsonb_build_array(0,0),'groups','[null,null]'::jsonb,'phase','red','clear',2,'shots',0,'message','Waiting for a friend')) returning id into gid;
 return gid;
end $$;
create or replace function public.local_cue_join(p_game uuid) returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 update public.local_cue_matches set player_two=auth.uid(),status='playing',updated_at=now()
 where id=p_game and status='waiting' and player_two is null and player_one<>auth.uid();
 if not found then raise exception 'Match unavailable';end if;
end $$;
create or replace function public.local_cue_shot(p_game uuid,p_version integer,p_angle double precision,p_power double precision) returns jsonb
language plpgsql security definer set search_path=public as $$
declare g public.local_cue_matches%rowtype;
 xs float8[]:='{}';ys float8[]:='{}';vxs float8[]:='{}';vys float8[]:='{}'; nums int[]:='{}';alive boolean[]:='{}';
 b jsonb:='[]'::jsonb;pots int[]:='{}'; nballs int;i int;j int;k int;step int; px float8;py float8;dx float8;dy float8;dist float8;nx float8;ny float8;overlap float8;rel float8;imp float8;fr float8;speed float8;
 radius float8;first_hit int:=null; scratch boolean:=false;rail_hit boolean:=false;moving boolean; ball_potted boolean;
 player int;other int;foul boolean:=false;keep_turn boolean:=false;pot int;potgroup text;current_group text;target_group text;newgroups jsonb;score1 int;score2 int;points int:=0;penalty int:=4;phase text;clear_num int;reds_left boolean;own_left boolean;winner_id uuid;msg text;newstate jsonb;hist jsonb;placed boolean;
begin
 if auth.uid() is null then raise exception 'Sign in first';end if;
 if p_angle is null or p_power is null or p_angle::text in ('NaN','Infinity','-Infinity') or p_power::text in ('NaN','Infinity','-Infinity') or p_angle< -6.2831853072 or p_angle>6.2831853072 or p_power<0.5 or p_power>16 then raise exception 'Invalid shot';end if;
 select * into g from public.local_cue_matches where id=p_game for update;
 if not found or g.status<>'playing' or g.turn_user<>auth.uid() then raise exception 'Not your turn';end if;
 if g.version<>p_version then raise exception 'Outdated match state. Refresh.';end if;
 player:=case when auth.uid()=g.player_one then 1 else 2 end;other:=3-player;
 nballs:=jsonb_array_length(g.state->'balls');
 for i in 0..nballs-1 loop
  xs:=array_append(xs,(g.state->'balls'->i->>'x')::float8);ys:=array_append(ys,(g.state->'balls'->i->>'y')::float8);
  vxs:=array_append(vxs,0::float8);vys:=array_append(vys,0::float8);
  nums:=array_append(nums,(g.state->'balls'->i->>'n')::int);alive:=array_append(alive,(g.state->'balls'->i->>'live')::boolean);
 end loop;
 if not alive[1] then raise exception 'Cue ball is unavailable';end if;
 radius:=case when g.kind='pool' then 12 else 10 end;
 vxs[1]:=cos(p_angle)*p_power;vys[1]:=sin(p_angle)*p_power;
 -- Fixed timestep, bounded deterministic simulation inside the database transaction.
 for step in 1..1200 loop
  moving:=false;
  for i in 1..nballs loop
   if not alive[i] then continue;end if;
   xs[i]:=xs[i]+vxs[i]*0.5;ys[i]:=ys[i]+vys[i]*0.5;
   vxs[i]:=vxs[i]*0.988;vys[i]:=vys[i]*0.988;
   speed:=sqrt(vxs[i]*vxs[i]+vys[i]*vys[i]);
   if speed<0.035 then vxs[i]:=0;vys[i]:=0;else moving:=true;end if;
   ball_potted:=false;
   for k in 1..6 loop
    px:=case when k in (1,4) then 48 when k in (2,5) then 450 else 852 end;
    py:=case when k<=3 then 48 else 432 end;
    if (xs[i]-px)^2+(ys[i]-py)^2<22^2 then
     alive[i]:=false;vxs[i]:=0;vys[i]:=0;
     if i=1 then scratch:=true;else pots:=array_append(pots,nums[i]);end if;
     ball_potted:=true;exit;
    end if;
   end loop;
   if ball_potted then continue;end if;
   if xs[i]<48+radius then xs[i]:=48+radius;vxs[i]:=abs(vxs[i])*.89;rail_hit:=true;end if;
   if xs[i]>852-radius then xs[i]:=852-radius;vxs[i]:=-abs(vxs[i])*.89;rail_hit:=true;end if;
   if ys[i]<48+radius then ys[i]:=48+radius;vys[i]:=abs(vys[i])*.89;rail_hit:=true;end if;
   if ys[i]>432-radius then ys[i]:=432-radius;vys[i]:=-abs(vys[i])*.89;rail_hit:=true;end if;
  end loop;
  for i in 1..nballs loop
   if not alive[i] then continue;end if;
   for j in i+1..nballs loop
    if not alive[j] then continue;end if;
    dx:=xs[j]-xs[i];dy:=ys[j]-ys[i];dist:=sqrt(dx*dx+dy*dy);
    if dist>=2*radius then continue;end if;
    if dist<0.000001 then dx:=0.001;dy:=0;dist:=0.001;end if;
    nx:=dx/dist;ny:=dy/dist;overlap:=2*radius-dist;
    xs[i]:=xs[i]-nx*overlap/2;ys[i]:=ys[i]-ny*overlap/2;
    xs[j]:=xs[j]+nx*overlap/2;ys[j]:=ys[j]+ny*overlap/2;
    rel:=(vxs[i]-vxs[j])*nx+(vys[i]-vys[j])*ny;
    if rel>0 then
     if first_hit is null and (i=1 or j=1) then first_hit:=case when i=1 then nums[j] else nums[i] end;end if;
     imp:=rel*.97;vxs[i]:=vxs[i]-imp*nx;vys[i]:=vys[i]-imp*ny;vxs[j]:=vxs[j]+imp*nx;vys[j]:=vys[j]+imp*ny;
    end if;
   end loop;
  end loop;
  exit when not moving;
 end loop;
 -- Place a scratched cue ball on a clear baulk spot. No client-controlled placement.
 if scratch then
  placed:=false;
  for k in 0..24 loop
   px:=205-k*5;py:=240+((k%5)-2)*22;
   if px<48+radius then continue;end if;
   placed:=true;
   for j in 2..nballs loop
    if alive[j] and (xs[j]-px)^2+(ys[j]-py)^2<(radius*2+2)^2 then placed:=false;exit;end if;
   end loop;
   if placed then xs[1]:=px;ys[1]:=py;alive[1]:=true;exit;end if;
  end loop;
 end if;
 score1:=(g.state->'scores'->>0)::int;score2:=(g.state->'scores'->>1)::int;
 newgroups:=g.state->'groups';phase:=g.state->>'phase';clear_num:=coalesce((g.state->>'clear')::int,2);
 if g.kind='pool' then
  current_group:=newgroups->>(player-1);
  target_group:=case when first_hit between 1 and 7 then 'solids' when first_hit between 9 and 15 then 'stripes' when first_hit=8 then 'eight' else null end;
  own_left:=false;
  for i in 2..nballs loop
   if alive[i] and ((current_group='solids' and nums[i] between 1 and 7) or (current_group='stripes' and nums[i] between 9 and 15)) then own_left:=true;end if;
  end loop;
  foul:=scratch or first_hit is null or (current_group is null and target_group='eight') or
    (current_group is not null and target_group is distinct from case when own_left then current_group else 'eight' end) or
    (cardinality(pots)=0 and not rail_hit);
  foreach pot in array pots loop
   if pot=8 then
    winner_id:=case when foul or current_group is null or own_left then case when player=1 then g.player_two else g.player_one end else auth.uid() end;
   elsif current_group is null and not foul then
    potgroup:=case when pot between 1 and 7 then 'solids' else 'stripes' end;
    newgroups:=case when player=1 then jsonb_build_array(potgroup,case when potgroup='solids' then 'stripes' else 'solids' end) else jsonb_build_array(case when potgroup='solids' then 'stripes' else 'solids' end,potgroup) end;
    current_group:=potgroup;
   end if;
   if pot between 1 and 15 and pot<>8 and not foul and ((pot between 1 and 7 and current_group='solids') or (pot between 9 and 15 and current_group='stripes')) then keep_turn:=true;end if;
  end loop;
  msg:=case when winner_id is not null then 'Eight ball decided the match' when foul then 'Foul — turn changes' when keep_turn then 'Legal pot — continue' else 'Turn changes' end;
 else
  reds_left:=false;
  for i in 2..nballs loop if alive[i] and nums[i]=1 then reds_left:=true;end if;end loop;
  foul:=scratch or first_hit is null or (phase='red' and first_hit<>1) or (phase='color' and first_hit=1) or (phase='clear' and first_hit<>clear_num);
  foreach pot in array pots loop
   if (phase='red' and pot<>1) or (phase='color' and pot=1) or (phase='clear' and pot<>clear_num) then foul:=true;end if;
   penalty:=greatest(penalty,pot);points:=points+pot;
  end loop;
  penalty:=greatest(penalty,coalesce(first_hit,4));
  if foul then
   if other=1 then score1:=score1+penalty;else score2:=score2+penalty;end if;
  else
   if player=1 then score1:=score1+points;else score2:=score2+points;end if;
   keep_turn:=cardinality(pots)>0;
  end if;
  if phase='red' and keep_turn then phase:='color';
  elsif phase='color' and keep_turn then phase:=case when reds_left then 'red' else 'clear' end;
  elsif phase='clear' and keep_turn then clear_num:=clear_num+1;
  elsif phase='red' and not reds_left then phase:='clear';end if;
  -- Respot colours during red/colour alternation; fouled colours are also restored.
  if phase<>'clear' or foul then
   for i in 2..nballs loop
    if nums[i]>1 and not alive[i] then
     px:=330+(nums[i]-2)*47;py:=case when nums[i]%2=0 then 195 else 285 end;
     for k in 0..16 loop
      placed:=true;
      for j in 1..nballs loop
       if j<>i and alive[j] and (xs[j]-px)^2+(ys[j]-py)^2<(radius*2+2)^2 then placed:=false;exit;end if;
      end loop;
      exit when placed;
      px:=px-22;
     end loop;
     if placed then xs[i]:=px;ys[i]:=py;alive[i]:=true;end if;
    end if;
   end loop;
  end if;
  if clear_num>7 then winner_id:=case when score1>=score2 then g.player_one else g.player_two end;end if;
  msg:=case when foul then 'Snooker foul: '||penalty||' points to opponent' when keep_turn then 'Break +'||points else 'Turn changes' end;
 end if;
 for i in 1..nballs loop b:=b||jsonb_build_array(jsonb_build_object('n',nums[i],'x',round(xs[i]::numeric,3),'y',round(ys[i]::numeric,3),'live',alive[i]));end loop;
 newstate:=jsonb_build_object('balls',b,'scores',jsonb_build_array(score1,score2),'groups',newgroups,'phase',phase,'clear',clear_num,'shots',coalesce((g.state->>'shots')::int,0)+1,'message',msg,'first_hit',first_hit,'potted',to_jsonb(pots),'scratch',scratch);
 hist:=jsonb_build_array(jsonb_build_object('player',player,'message',msg,'potted',to_jsonb(pots),'shot',g.version+1))||g.history;
 update public.local_cue_matches set state=newstate,version=g.version+1,turn_user=case when winner_id is not null then turn_user when foul or not keep_turn then case when player=1 then g.player_two else g.player_one end else turn_user end,
 status=case when winner_id is not null then 'finished' else status end,winner=winner_id,history=(select coalesce(jsonb_agg(value),'[]'::jsonb) from (select value from jsonb_array_elements(hist) with ordinality as t(value,ord) order by ord limit 40) x),updated_at=now() where id=g.id;
 return newstate;
end $$;
revoke all on function public.local_cue_create(text),public.local_cue_join(uuid),public.local_cue_shot(uuid,integer,double precision,double precision) from public;
grant execute on function public.local_cue_create(text),public.local_cue_join(uuid),public.local_cue_shot(uuid,integer,double precision,double precision) to authenticated;
do $$begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='local_cue_matches') then
  alter publication supabase_realtime add table public.local_cue_matches;
 end if;
end$$;
