create table public.local_dj_complimentary_access (
 id uuid primary key default gen_random_uuid(),
 user_id uuid unique references auth.users(id) on delete cascade,
 venue_id uuid unique references public.local_venue_directory(id) on delete cascade,
 access_scope text not null default 'full' check(access_scope='full'),
 payment_required boolean not null default false check(payment_required=false),
 granted_by uuid not null references auth.users(id),
 granted_at timestamptz not null default now(),
 expires_at timestamptz,
 constraint local_dj_single_subject check(num_nonnulls(user_id,venue_id)=1)
);
alter table public.local_dj_complimentary_access enable row level security;
revoke all on public.local_dj_complimentary_access from public,anon,authenticated;
grant select,insert,update,delete on public.local_dj_complimentary_access to service_role;
create policy "Trusted service manages DJ complimentary access" on public.local_dj_complimentary_access for all to service_role using(true) with check(true);
comment on table public.local_dj_complimentary_access is 'Trusted DJ access grants. DJ server must verify signed-in identity and venue management separately. No client-side email or local-storage bypass.';
