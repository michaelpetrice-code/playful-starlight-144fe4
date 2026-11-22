-- Member notices are sent by a trusted server, and readable only by their recipient.
create table public.local_member_notices (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 campaign text not null,
 title text not null check(length(title) between 1 and 120),
 body text not null check(length(body) between 1 and 2000),
 created_at timestamptz not null default now(),
 unique(user_id,campaign)
);
alter table public.local_member_notices enable row level security;
revoke all on public.local_member_notices from public,anon,authenticated;
grant select on public.local_member_notices to authenticated;
grant all on public.local_member_notices to service_role;
create policy "Members read their own notices" on public.local_member_notices for select to authenticated using (user_id=(select auth.uid()));
create index local_member_notices_date on public.local_member_notices(user_id,created_at desc);
