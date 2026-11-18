-- v180: stores venue-owner notification preferences only; no messages are sent by this migration.
CREATE TABLE IF NOT EXISTS public.local_builder_notification_settings (
 owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 settings jsonb NOT NULL DEFAULT '{}'::jsonb,
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.local_builder_notification_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.local_builder_notification_settings FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.local_builder_notification_settings TO authenticated;
DROP POLICY IF EXISTS builder_notification_own_select ON public.local_builder_notification_settings;
CREATE POLICY builder_notification_own_select ON public.local_builder_notification_settings FOR SELECT TO authenticated USING (owner_id = (select auth.uid()));
DROP POLICY IF EXISTS builder_notification_own_insert ON public.local_builder_notification_settings;
CREATE POLICY builder_notification_own_insert ON public.local_builder_notification_settings FOR INSERT TO authenticated WITH CHECK (owner_id = (select auth.uid()));
DROP POLICY IF EXISTS builder_notification_own_update ON public.local_builder_notification_settings;
CREATE POLICY builder_notification_own_update ON public.local_builder_notification_settings FOR UPDATE TO authenticated USING (owner_id = (select auth.uid())) WITH CHECK (owner_id = (select auth.uid()));
