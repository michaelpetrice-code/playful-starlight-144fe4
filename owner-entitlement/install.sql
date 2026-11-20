begin;
-- Keep the environment's existing subscriber/admin rules intact, then add permanent owner access.
do $$ begin
 if to_regprocedure('public.local_builder_account_active_before_owner_comp(uuid)') is null then
  alter function public.local_builder_account_active(uuid) rename to local_builder_account_active_before_owner_comp;
 end if;
end $$;
create or replace function public.local_builder_account_active(p_user uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.local_platform_owners o where o.user_id=p_user)
 or public.local_builder_account_active_before_owner_comp(p_user);
$$;
revoke all on function public.local_builder_account_active_before_owner_comp(uuid) from public,anon,authenticated;
create or replace function public.local_billing_status()
returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
 'eligible',public.local_builder_has_access(),
 'complimentary',public.local_is_owner(),
 'customer',exists(select 1 from public.local_billing_customers c where c.user_id=auth.uid()),
 'subscribed',exists(select 1 from public.local_billing_subscriptions s where s.user_id=auth.uid() and s.status not in ('canceled','incomplete_expired')));
$$;
revoke all on function public.local_builder_account_active(uuid) from public,anon,authenticated;
grant execute on function public.local_builder_account_active(uuid) to service_role;
revoke all on function public.local_billing_status() from public,anon;
grant execute on function public.local_billing_status() to authenticated;
commit;
