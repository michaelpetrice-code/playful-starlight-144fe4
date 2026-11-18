-- Run in The Local Supabase SQL editor. Review before applying.
create table if not exists public.local_competitions (
 id uuid primary key default gen_random_uuid(), venue_id uuid not null references public.platform_venues(id) on delete cascade,
 title text not null check(length(title) between 3 and 100), game text not null check(length(game) between 2 and 40),
 starts_at timestamptz not null, status text not null default 'open' check(status in ('open','closed','completed')),
 created_by uuid not null references auth.users(id), created_at timestamptz not null default now());
create table if not exists public.local_competition_entries (
 competition_id uuid not null references public.local_competitions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, joined_at timestamptz not null default now(),
 primary key(competition_id,user_id));
create table if not exists public.local_competition_results (
 id uuid primary key default gen_random_uuid(), competition_id uuid not null references public.local_competitions(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, points int not null check(points between 0 and 10000),
 recorded_by uuid not null references auth.users(id), recorded_at timestamptz not null default now(),
 unique(competition_id,user_id));
create table if not exists public.local_competition_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade, display_name text not null check(length(display_name) between 2 and 40));
create table if not exists public.local_competition_challenges (
 id uuid primary key default gen_random_uuid(), venue_id uuid not null references public.platform_venues(id) on delete cascade,
 from_user uuid not null references auth.users(id), to_user uuid not null references auth.users(id),
 game text not null check(length(game) between 2 and 40), status text not null default 'pending' check(status in ('pending','accepted','declined')),
 created_at timestamptz not null default now(), check(from_user <> to_user));
create index if not exists local_competitions_venue_idx on public.local_competitions(venue_id,starts_at);
create index if not exists local_competition_challenges_target_idx on public.local_competition_challenges(to_user);
-- Venue staff control creation, closure and verified results.
create or replace function public.local_competition_staff(p_venue uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.platform_venue_staff where venue_id=p_venue and user_id=auth.uid() and role in ('owner','admin','manager')); $$;
revoke all on function public.local_competition_staff(uuid) from public; grant execute on function public.local_competition_staff(uuid) to authenticated;
alter table public.local_competitions enable row level security;
alter table public.local_competition_entries enable row level security;
alter table public.local_competition_results enable row level security;
alter table public.local_competition_profiles enable row level security;
alter table public.local_competition_challenges enable row level security;
drop policy if exists lc_read on public.local_competitions; create policy lc_read on public.local_competitions for select to authenticated using(true);
drop policy if exists lc_staff_insert on public.local_competitions; create policy lc_staff_insert on public.local_competitions for insert to authenticated with check(created_by=auth.uid() and public.local_competition_staff(venue_id));
drop policy if exists lc_staff_update on public.local_competitions; create policy lc_staff_update on public.local_competitions for update to authenticated using(public.local_competition_staff(venue_id)) with check(public.local_competition_staff(venue_id));
drop policy if exists le_read on public.local_competition_entries; create policy le_read on public.local_competition_entries for select to authenticated using(true);
drop policy if exists le_join on public.local_competition_entries; create policy le_join on public.local_competition_entries for insert to authenticated with check(user_id=auth.uid() and exists(select 1 from public.local_competitions c where c.id=competition_id and c.status='open' and c.starts_at>now()));
drop policy if exists le_leave on public.local_competition_entries; create policy le_leave on public.local_competition_entries for delete to authenticated using(user_id=auth.uid());
drop policy if exists lr_read on public.local_competition_results; create policy lr_read on public.local_competition_results for select to authenticated using(true);
drop policy if exists lr_staff_insert on public.local_competition_results; create policy lr_staff_insert on public.local_competition_results for insert to authenticated with check(recorded_by=auth.uid() and exists(select 1 from public.local_competitions c join public.local_competition_entries e on e.competition_id=c.id and e.user_id=local_competition_results.user_id where c.id=competition_id and public.local_competition_staff(c.venue_id)));
drop policy if exists lr_staff_update on public.local_competition_results; create policy lr_staff_update on public.local_competition_results for update to authenticated using(exists(select 1 from public.local_competitions c where c.id=competition_id and public.local_competition_staff(c.venue_id))) with check(recorded_by=auth.uid() and exists(select 1 from public.local_competitions c where c.id=competition_id and public.local_competition_staff(c.venue_id)));
drop policy if exists lp_read on public.local_competition_profiles; create policy lp_read on public.local_competition_profiles for select to authenticated using(true);
drop policy if exists lp_insert on public.local_competition_profiles; create policy lp_insert on public.local_competition_profiles for insert to authenticated with check(user_id=auth.uid());
drop policy if exists lp_update on public.local_competition_profiles; create policy lp_update on public.local_competition_profiles for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists lch_read on public.local_competition_challenges; create policy lch_read on public.local_competition_challenges for select to authenticated using(from_user=auth.uid() or to_user=auth.uid());
drop policy if exists lch_send on public.local_competition_challenges; create policy lch_send on public.local_competition_challenges for insert to authenticated with check(from_user=auth.uid() and status='pending');
drop policy if exists lch_reply on public.local_competition_challenges; create policy lch_reply on public.local_competition_challenges for update to authenticated using(to_user=auth.uid() and status='pending') with check(to_user=auth.uid() and status in ('accepted','declined'));
-- Challenges are invitations only; starting a multiplayer match still uses the existing game engine.
