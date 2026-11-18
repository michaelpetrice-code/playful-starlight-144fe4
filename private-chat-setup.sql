-- The Local v17: authenticated, invitation-only chat rooms.
-- Run in Supabase SQL Editor. Existing public community chats are unaffected.
create extension if not exists pgcrypto;
create table if not exists public.private_chat_rooms (
 id uuid primary key default gen_random_uuid(),
 name text not null check (char_length(name) between 1 and 60),
 created_by uuid not null references auth.users(id),
 invite_code text not null unique default encode(gen_random_bytes(18),'hex'),
 created_at timestamptz not null default now()
);
create table if not exists public.private_chat_members (
 room_id uuid not null references public.private_chat_rooms(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 joined_at timestamptz not null default now(),
 primary key(room_id,user_id)
);
create table if not exists public.private_chat_messages (
 id uuid primary key default gen_random_uuid(),
 room_id uuid not null references public.private_chat_rooms(id) on delete cascade,
 sender_id uuid not null references auth.users(id),
 body text not null check (char_length(body) between 1 and 2000),
 created_at timestamptz not null default now()
);
create index if not exists private_chat_messages_room_date on public.private_chat_messages(room_id,created_at);
create index if not exists private_chat_members_user on public.private_chat_members(user_id);

create or replace function public.is_private_chat_member(target_room uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.private_chat_members where room_id=target_room and user_id=(select auth.uid()));
$$;
revoke all on function public.is_private_chat_member(uuid) from public;
grant execute on function public.is_private_chat_member(uuid) to authenticated;

alter table public.private_chat_rooms enable row level security;
alter table public.private_chat_members enable row level security;
alter table public.private_chat_messages enable row level security;
-- Clients cannot read invite codes from rooms; grant column-level select only.
revoke all on public.private_chat_rooms from anon,authenticated;
grant select(id,name,created_by,created_at) on public.private_chat_rooms to authenticated;
grant select,delete on public.private_chat_members to authenticated;
grant select,insert on public.private_chat_messages to authenticated;

drop policy if exists private_room_member_read on public.private_chat_rooms;
create policy private_room_member_read on public.private_chat_rooms for select to authenticated using (public.is_private_chat_member(id));
drop policy if exists private_member_read on public.private_chat_members;
create policy private_member_read on public.private_chat_members for select to authenticated using (public.is_private_chat_member(room_id));
drop policy if exists private_member_leave on public.private_chat_members;
create policy private_member_leave on public.private_chat_members for delete to authenticated using (user_id=(select auth.uid()));
drop policy if exists private_message_read on public.private_chat_messages;
create policy private_message_read on public.private_chat_messages for select to authenticated using (public.is_private_chat_member(room_id));
drop policy if exists private_message_write on public.private_chat_messages;
create policy private_message_write on public.private_chat_messages for insert to authenticated with check (sender_id=(select auth.uid()) and public.is_private_chat_member(room_id));

create or replace function public.create_private_chat_room(room_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if length(trim(room_name)) not between 1 and 60 then raise exception 'Group name must be 1-60 characters'; end if;
 insert into public.private_chat_rooms(name,created_by) values(trim(room_name),auth.uid()) returning id into rid;
 insert into public.private_chat_members(room_id,user_id) values(rid,auth.uid());
 return rid;
end $$;
create or replace function public.join_private_chat_room(invite_code_input text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select id into rid from public.private_chat_rooms where invite_code=lower(trim(invite_code_input));
 if rid is null then raise exception 'Invalid invitation code'; end if;
 insert into public.private_chat_members(room_id,user_id) values(rid,auth.uid()) on conflict do nothing;
 return rid;
end $$;
create or replace function public.get_private_chat_invite(room_id_input uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare code text;
begin
 select invite_code into code from public.private_chat_rooms where id=room_id_input and created_by=auth.uid();
 if code is null then raise exception 'Only the group creator can retrieve the invitation'; end if;
 return code;
end $$;
revoke all on function public.create_private_chat_room(text) from public;
revoke all on function public.join_private_chat_room(text) from public;
revoke all on function public.get_private_chat_invite(uuid) from public;
grant execute on function public.create_private_chat_room(text) to authenticated;
grant execute on function public.join_private_chat_room(text) to authenticated;
grant execute on function public.get_private_chat_invite(uuid) to authenticated;
