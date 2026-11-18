-- The Local v177: Venue Builder image uploads.
-- Run in the production Supabase SQL Editor BEFORE deploying the v177 website.
-- Public bucket: photos are visible to anyone with their URL, including published venue visitors.
-- Never upload private member information or confidential images.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('local-venue-media', 'local-venue-media', true, 5242880,
        ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "local_venue_media_upload_own" ON storage.objects;
CREATE POLICY "local_venue_media_upload_own" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'local-venue-media'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND lower(storage.extension(name)) IN ('jpg','png','webp')
);

-- Uploaded files use unique names and are not overwritten or deleted by the client.
-- To control costs, review unreferenced uploads periodically before deletion.

-- Update only the existing builder save function to allow an optional HTTPS card image.
-- Existing fields, ownership checks, subscription checks, and revisions remain unchanged.
create or replace function public.local_builder_save(p_slug text, p_draft jsonb, p_revision integer, p_publish boolean)
returns integer language plpgsql security definer set search_path = '' as $$
declare f record; c jsonb; next_revision integer;
begin
  if not public.local_builder_has_access() then raise exception 'An active venue subscription is required.'; end if;
  if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug) not between 3 and 60 then
    raise exception 'Choose a link name between 3 and 60 characters using letters, numbers and single hyphens.';
  end if;
  if p_publish is null or p_revision is null or p_revision < 0 or p_draft is null or
      jsonb_typeof(p_draft) is distinct from 'object' or octet_length(p_draft::text) > 32000 then
    raise exception 'Review the app details and try again.';
  end if;
  if p_draft - array['name','type','town','welcome','theme','logo','features'] <> '{}'::jsonb then
    raise exception 'Unexpected app details.';
  end if;
  for f in select * from (values ('name',90), ('type',60), ('town',90), ('welcome',700), ('theme',16), ('logo',1024)) as fields(key, max_size) loop
    if jsonb_typeof(p_draft->f.key) is distinct from 'string' or length(p_draft->>f.key) > f.max_size then
      raise exception 'One or more app details are invalid.';
    end if;
  end loop;
  if length(btrim(p_draft->>'name')) < 2 or p_draft->>'theme' not in ('emerald','burgundy','navy','charcoal')
    or (p_draft->>'logo' <> '' and p_draft->>'logo' !~ '^https://[^[:space:]]+$') then
    raise exception 'Check the venue name, theme and HTTPS logo link.';
  end if;
  if jsonb_typeof(p_draft->'features') is distinct from 'object'
    or p_draft->'features' - array['events','tickets','room','bingo','draw','rewards','gallery','games','contact'] <> '{}'::jsonb then
    raise exception 'Choose features from the venue app builder.';
  end if;
  for f in select * from jsonb_each(p_draft->'features') loop
    if jsonb_typeof(f.value) is distinct from 'array' then raise exception 'Check feature content.'; end if;
    if jsonb_array_length(f.value) > 8 then raise exception 'A feature supports up to eight cards.'; end if;
    for c in select value from jsonb_array_elements(f.value) loop
      if jsonb_typeof(c) is distinct from 'object' or c - array['title','detail','url','image'] <> '{}'::jsonb
        or jsonb_typeof(c->'title') is distinct from 'string' or length(btrim(c->>'title')) not between 1 and 90
        or jsonb_typeof(c->'detail') is distinct from 'string' or length(c->>'detail') > 700
        or jsonb_typeof(c->'url') is distinct from 'string' or length(c->>'url') > 1024
        or (c->>'url' <> '' and c->>'url' !~ '^https://[^[:space:]]+$')
        or (c ? 'image' and (jsonb_typeof(c->'image') is distinct from 'string'
            or length(c->>'image') > 1024
            or (c->>'image' <> '' and c->>'image' !~ '^https://[^[:space:]]+$'))) then
        raise exception 'Check card titles, text and HTTPS links.';
      end if;
    end loop;
  end loop;

  if p_publish and not exists (
    select 1 from jsonb_each(p_draft->'features') f
    where f.key in ('room','contact','games','bingo') or jsonb_array_length(f.value) > 0
  ) then raise exception 'Add at least one feature with content before publishing.'; end if;

  if p_revision = 0 then
    insert into public.local_builder_apps(owner_id, slug, draft, published)
    values (auth.uid(), p_slug, p_draft, case when p_publish then p_draft end)
    on conflict (owner_id) do nothing returning revision into next_revision;
  else
    update public.local_builder_apps a
      set draft = p_draft, published = case when p_publish then p_draft else a.published end,
          revision = a.revision + 1
      where a.owner_id = auth.uid() and a.slug = p_slug and a.revision = p_revision
      returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'This draft changed in another tab. Reload the builder before saving.'; end if;
  return next_revision;
exception when unique_violation then
  raise exception 'That public link name is already in use. Choose a different one.';
end $$;
