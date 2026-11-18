-- Run ONLY in The Local - Staging, after Phase 1.
-- Allows owners to manage staff while preserving audit history.
BEGIN;
CREATE OR REPLACE FUNCTION public.platform_is_owner(p_venue uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.platform_venue_staff
 WHERE venue_id=p_venue AND user_id=(SELECT auth.uid()) AND role='owner');
$$;
REVOKE ALL ON FUNCTION public.platform_is_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.platform_is_owner(uuid) TO authenticated;
DROP POLICY IF EXISTS "staff owners insert" ON public.platform_venue_staff;
CREATE POLICY "staff owners insert" ON public.platform_venue_staff FOR INSERT TO authenticated
WITH CHECK (public.platform_is_owner(venue_id) AND role IN ('admin','manager','staff'));
DROP POLICY IF EXISTS "staff owners remove" ON public.platform_venue_staff;
CREATE POLICY "staff owners remove" ON public.platform_venue_staff FOR DELETE TO authenticated
USING (public.platform_is_owner(venue_id) AND role <> 'owner');
-- No UPDATE policy: staff role changes must be remove-and-add by an owner.
-- Audit records remain read-only to client roles.
REVOKE INSERT,UPDATE,DELETE ON public.platform_venue_audit FROM anon,authenticated;
-- Limit privilege exposure for sensitive definer helpers.
REVOKE ALL ON FUNCTION public.platform_audit_changes() FROM PUBLIC;
COMMIT;
