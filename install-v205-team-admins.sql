-- The Local v205: App Builder team administration (max 5 including owner)
-- Run in Supabase SQL Editor after taking a database backup. Do not rerun v204 SQL.
BEGIN;
CREATE TABLE IF NOT EXISTS public.local_builder_team_members (
 owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 role text NOT NULL CHECK (role IN ('owner','admin')),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (owner_id,user_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS local_builder_team_one_membership ON public.local_builder_team_members(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS local_builder_team_one_owner ON public.local_builder_team_members(owner_id) WHERE role='owner';
ALTER TABLE public.local_builder_team_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.local_builder_team_members FROM PUBLIC, anon, authenticated;
-- No direct table access: only tightly scoped RPCs.
CREATE OR REPLACE FUNCTION public.local_builder_effective_owner()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_user uuid := auth.uid(); v_owner uuid;
BEGIN
 IF v_user IS NULL THEN RETURN NULL; END IF;
 IF EXISTS (SELECT 1 FROM public.local_builder_apps WHERE owner_id=v_user) THEN RETURN v_user; END IF;
 SELECT owner_id INTO v_owner FROM public.local_builder_team_members WHERE user_id=v_user;
 RETURN coalesce(v_owner,v_user);
END $fn$;
CREATE OR REPLACE FUNCTION public.local_builder_has_access()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
 SELECT auth.uid() IS NOT NULL AND public.local_builder_account_active(public.local_builder_effective_owner())
$fn$;
CREATE OR REPLACE FUNCTION public.local_builder_team_list()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_owner uuid := public.local_builder_effective_owner();
BEGIN
 IF auth.uid() IS NULL OR NOT public.local_builder_has_access() THEN RAISE EXCEPTION 'Not authorised'; END IF;
 RETURN jsonb_build_object('owner_id',v_owner,'is_owner',v_owner=auth.uid(),
  'members',coalesce((SELECT jsonb_agg(jsonb_build_object('user_id',m.user_id,'role',m.role,'created_at',m.created_at) ORDER BY m.created_at)
   FROM public.local_builder_team_members m WHERE m.owner_id=v_owner),'[]'::jsonb));
END $fn$;
CREATE OR REPLACE FUNCTION public.local_builder_team_add(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE v_owner uuid := auth.uid(); v_count int;
BEGIN
 IF v_owner IS NULL OR p_user IS NULL OR p_user=v_owner THEN RAISE EXCEPTION 'Invalid team member'; END IF;
 IF NOT public.local_builder_account_active(v_owner) OR NOT EXISTS(SELECT 1 FROM public.local_builder_apps WHERE owner_id=v_owner) THEN
  RAISE EXCEPTION 'Only an active app owner can manage their team'; END IF;
 IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id=p_user) THEN RAISE EXCEPTION 'User account not found'; END IF;
 IF EXISTS (SELECT 1 FROM public.local_builder_apps WHERE owner_id=p_user) THEN RAISE EXCEPTION 'An app owner cannot join another team'; END IF;
 -- Advisory transaction lock serialises all changes for this owner, including concurrent invitations.
 PERFORM pg_advisory_xact_lock(hashtextextended(v_owner::text, 205));
 IF EXISTS (SELECT 1 FROM public.local_builder_team_members WHERE user_id=v_owner AND owner_id<>v_owner) THEN
  RAISE EXCEPTION 'An administrator of another team cannot create a team'; END IF;
 INSERT INTO public.local_builder_team_members(owner_id,user_id,role)
 VALUES(v_owner,v_owner,'owner') ON CONFLICT(owner_id,user_id) DO NOTHING;
 SELECT count(*) INTO v_count FROM public.local_builder_team_members WHERE owner_id=v_owner;
 IF v_count >= 5 AND NOT EXISTS(SELECT 1 FROM public.local_builder_team_members WHERE owner_id=v_owner AND user_id=p_user) THEN
  RAISE EXCEPTION 'All five administrator places are in use'; END IF;
 INSERT INTO public.local_builder_team_members(owner_id,user_id,role)
 VALUES(v_owner,p_user,'admin') ON CONFLICT(owner_id,user_id) DO NOTHING;
END $fn$;
CREATE OR REPLACE FUNCTION public.local_builder_team_remove(p_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
BEGIN
 IF auth.uid() IS NULL OR p_user IS NULL OR p_user=auth.uid() THEN RAISE EXCEPTION 'Only the owner can remove another administrator'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.local_builder_team_members WHERE owner_id=auth.uid() AND user_id=auth.uid() AND role='owner') THEN
  RAISE EXCEPTION 'Only the owner can remove administrators'; END IF;
 DELETE FROM public.local_builder_team_members WHERE owner_id=auth.uid() AND user_id=p_user AND role='admin';
END $fn$;
REVOKE ALL ON FUNCTION public.local_builder_effective_owner() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.local_builder_team_list() FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.local_builder_team_add(uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.local_builder_team_remove(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.local_builder_effective_owner() TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.local_builder_team_list() TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.local_builder_team_add(uuid) TO authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.local_builder_team_remove(uuid) TO authenticated,service_role;

-- Existing function retained, with owner lookup redirected to the authorised team owner.
CREATE OR REPLACE FUNCTION public.local_builder_get()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if not public.local_builder_has_access() then return jsonb_build_object('eligible', false); end if;
  return jsonb_build_object('eligible', true, 'app', (
    select jsonb_build_object('slug', a.slug, 'draft', a.draft, 'revision', a.revision, 'published', a.published is not null)
    from public.local_builder_apps a where a.owner_id = public.local_builder_effective_owner()
  ));
end $function$;

-- Existing function retained, with owner lookup redirected to the authorised team owner.
CREATE OR REPLACE FUNCTION public.local_builder_save(p_slug text, p_draft jsonb, p_revision integer, p_publish boolean)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      if jsonb_typeof(c) is distinct from 'object' or c - array['title','detail','url'] <> '{}'::jsonb
        or jsonb_typeof(c->'title') is distinct from 'string' or length(btrim(c->>'title')) not between 1 and 90
        or jsonb_typeof(c->'detail') is distinct from 'string' or length(c->>'detail') > 700
        or jsonb_typeof(c->'url') is distinct from 'string' or length(c->>'url') > 1024
        or (c->>'url' <> '' and c->>'url' !~ '^https://[^[:space:]]+$') then
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
    values (public.local_builder_effective_owner(), p_slug, p_draft, case when p_publish then p_draft end)
    on conflict (owner_id) do nothing returning revision into next_revision;
  else
    update public.local_builder_apps a
      set draft = p_draft, published = case when p_publish then p_draft else a.published end,
          revision = a.revision + 1
      where a.owner_id = public.local_builder_effective_owner() and a.slug = p_slug and a.revision = p_revision
      returning revision into next_revision;
  end if;
  if next_revision is null then raise exception 'This draft changed in another tab. Reload the builder before saving.'; end if;
  return next_revision;
exception when unique_violation then
  raise exception 'That public link name is already in use. Choose a different one.';
end $function$;

-- Existing function retained, with owner lookup redirected to the authorised team owner.
CREATE OR REPLACE FUNCTION public.local_builder_unpublish(p_revision integer)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare next_revision integer;
begin
  if not public.local_builder_has_access() then raise exception 'An active venue subscription is required.'; end if;
  update public.local_builder_apps a set published = null, revision = revision + 1
    where a.owner_id = public.local_builder_effective_owner() and a.revision = p_revision returning revision into next_revision;
  if next_revision is null then raise exception 'This draft changed in another tab. Reload the builder.'; end if;
  return next_revision;
end $function$;
COMMIT;
