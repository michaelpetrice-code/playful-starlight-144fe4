begin;
create table if not exists public.tl_video_rooms (
 id uuid primary key default gen_random_uuid(),
 table_id uuid not null unique references public.tl_tables(id) on delete cascade,
 host uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('call','stream')),
 expires_at timestamptz not null default (now()+interval '45 seconds')
);
create table if not exists public.tl_video_peers (
 room_id uuid not null references public.tl_video_rooms(id) on delete cascade,
 client_id uuid not null,
 user_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null default (now()+interval '45 seconds'),
 primary key(room_id,client_id),
 unique(room_id,user_id)
);
create table if not exists public.tl_video_signals (
 room_id uuid not null,
 sender uuid not null,
 recipient uuid not null,
 kind text not null check(kind in ('offer','answer')),
 sdp text not null check(length(sdp) between 1 and 32000),
 primary key(room_id,sender,recipient,kind),
 foreign key(room_id,sender) references public.tl_video_peers(room_id,client_id) on delete cascade,
 foreign key(room_id,recipient) references public.tl_video_peers(room_id,client_id) on delete cascade,
 check(sender<>recipient)
);
alter table public.tl_video_rooms enable row level security;
alter table public.tl_video_peers enable row level security;
alter table public.tl_video_signals enable row level security;
revoke all on public.tl_video_rooms,public.tl_video_peers,public.tl_video_signals from public,anon,authenticated;

create or replace function public.tl_video_room(p_table uuid,p_client uuid,p_action text default 'status',p_room uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();
 room public.tl_video_rooms%rowtype;
 peer public.tl_video_peers%rowtype;
 is_host boolean;
begin
 if actor is null or not public.tl_is_member(p_table) then raise exception 'Table membership is required.'; end if;
 if p_client is null or p_action is null or p_action not in ('status','call','stream','join','leave') then raise exception 'Invalid video action.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('tl-video:'||p_table::text,0));
 delete from public.tl_video_rooms r where r.table_id=p_table and (
  r.expires_at<=now() or not exists(select 1 from public.tl_table_members m where m.table_id=p_table and m.user_id=r.host and m.status='approved')
 );
 select * into room from public.tl_video_rooms where table_id=p_table;
 if room.id is not null then
  delete from public.tl_video_peers p where p.room_id=room.id and (
   p.expires_at<=now() or not exists(select 1 from public.tl_table_members m where m.table_id=p_table and m.user_id=p.user_id and m.status='approved')
  );
  select * into peer from public.tl_video_peers where room_id=room.id and client_id=p_client and user_id=actor;
 end if;
 if p_action in ('call','stream') then
  if room.id is not null then raise exception 'A table video session is already running.'; end if;
  if p_action='stream' and not public.tl_is_admin(p_table) then raise exception 'Only a table host or moderator can go live.'; end if;
  insert into public.tl_video_rooms(table_id,host,kind) values(p_table,actor,p_action) returning * into room;
  insert into public.tl_video_peers(room_id,client_id,user_id) values(room.id,p_client,actor) returning * into peer;
 elsif p_action='join' then
  if room.id is null or room.id is distinct from p_room then raise exception 'That video session has ended.'; end if;
  if peer.client_id is null then
   if exists(select 1 from public.tl_video_peers where room_id=room.id and user_id=actor) then
    raise exception 'You’re already in this session on another tab or device.';
   end if;
   if (select count(*) from public.tl_video_peers where room_id=room.id)>=(case when room.kind='call' then 4 else 6 end) then
    raise exception 'This video session is full.';
   end if;
   insert into public.tl_video_peers(room_id,client_id,user_id) values(room.id,p_client,actor) returning * into peer;
  end if;
 elsif p_action='leave' and room.id=p_room and peer.client_id is not null then
  if room.host=actor then delete from public.tl_video_rooms where id=room.id;
  else delete from public.tl_video_peers where room_id=room.id and client_id=p_client; end if;
  return null;
 end if;
 if room.id is null then return null; end if;
 is_host := room.host=actor;
 if peer.client_id is not null and (p_action<>'status' or p_room=room.id) then
  update public.tl_video_peers set expires_at=now()+interval '45 seconds' where room_id=room.id and client_id=p_client;
  if is_host then update public.tl_video_rooms set expires_at=now()+interval '45 seconds' where id=room.id; end if;
 end if;
 return jsonb_build_object('id',room.id,'kind',room.kind,'joined',peer.client_id is not null,'host',is_host,
  'peers',case when peer.client_id is not null then (
   select coalesce(jsonb_agg(jsonb_build_object('id',p.client_id,'host',p.user_id=room.host,
   'name',left(coalesce(nullif(btrim(u.raw_user_meta_data->>'display_name'),''),'Member'),60))), '[]'::jsonb)
   from public.tl_video_peers p join auth.users u on u.id=p.user_id where p.room_id=room.id and p.client_id<>p_client
  ) else '[]'::jsonb end,
  'signals',case when peer.client_id is not null then (
   select coalesce(jsonb_agg(jsonb_build_object('sender',s.sender,'kind',s.kind,'sdp',s.sdp)),'[]'::jsonb)
   from public.tl_video_signals s where s.room_id=room.id and s.recipient=p_client
  ) else '[]'::jsonb end);
end $$;

create or replace function public.tl_video_signal(p_room uuid,p_client uuid,p_peer uuid,p_kind text,p_sdp text)
returns void language plpgsql security definer set search_path='' as $$
declare
 actor uuid := auth.uid();
 room public.tl_video_rooms%rowtype;
 remote_user uuid;
begin
 select * into room from public.tl_video_rooms where id=p_room and expires_at>now();
 if actor is null or room.id is null or not public.tl_is_member(room.table_id)
  or not exists(select 1 from public.tl_video_peers where room_id=p_room and client_id=p_client and user_id=actor and expires_at>now()) then
  raise exception 'You are not in this session.';
 end if;
 select user_id into remote_user from public.tl_video_peers where room_id=p_room and client_id=p_peer and expires_at>now();
 if remote_user is null or not exists(select 1 from public.tl_table_members
  where table_id=room.table_id and user_id=remote_user and status='approved') then
  raise exception 'This participant has left.';
 end if;
 if room.kind='stream' and not ((p_kind='offer' and actor=room.host) or (p_kind='answer' and remote_user=room.host)) then
  raise exception 'Only the host can broadcast video.';
 end if;
 insert into public.tl_video_signals(room_id,sender,recipient,kind,sdp) values(p_room,p_client,p_peer,p_kind,p_sdp)
  on conflict do nothing;
end $$;
revoke all on function public.tl_video_room(uuid,uuid,text,uuid),public.tl_video_signal(uuid,uuid,uuid,text,text) from public,anon;
grant execute on function public.tl_video_room(uuid,uuid,text,uuid),public.tl_video_signal(uuid,uuid,uuid,text,text) to authenticated;
notify pgrst,'reload schema';
commit;
