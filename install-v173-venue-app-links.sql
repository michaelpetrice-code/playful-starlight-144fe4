-- Run in The Local's Supabase project after the venue directory and billing setup.
-- The directory remains managed by platform administrators.
begin;

alter table public.local_venue_directory
  add column if not exists app_url text,
  add column if not exists builder_app_slug text;

create or replace function public.local_directory_app_links()
returns table (venue_id uuid, app_url text, published_app_slug text)
language sql stable security definer set search_path = '' as $$
  select v.id,
    case when v.app_url ~ '^https://[^[:space:]]+$' and length(v.app_url) <= 1024 then v.app_url end,
    a.slug
  from public.local_venue_directory v
  left join public.local_builder_apps a
    on a.slug = v.builder_app_slug
   and a.published is not null
   and public.local_builder_account_active(a.owner_id)
  where v.status in ('approved','featured')
    and (v.app_url is not null or a.slug is not null)
$$;

revoke all on function public.local_directory_app_links() from public,anon,authenticated;
grant execute on function public.local_directory_app_links() to anon,authenticated;

update public.local_venue_directory
set app_url = 'https://stellar-mandazi-6aa7db.netlify.app/'
where lower(btrim(name)) in ('coombe social club','the coombe social club')
  and lower(btrim(town)) = 'coventry' and app_url is null;

commit;

-- In Table Editor, use app_url for a standalone HTTPS venue app, or
-- builder_app_slug for a published Venue App Builder app (the value after ?venue=).
-- If both are set, the active published builder app takes precedence.
-- Link by the approved directory row. Leave these blank for venues with no app yet.
