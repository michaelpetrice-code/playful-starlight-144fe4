-- The Local v204: five owner/admin accounts per venue, across every subscriber app
-- Run AFTER PHASE2-STAGING-SECURITY.sql. Test in staging first.
-- Does not alter subscription status or provision anyone automatically.
begin;
create or replace function public.platform_limit_five_admins()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare admin_total integer;
begin
 if new.role not in ('owner','admin') then return new; end if;
 -- Serialise changes per venue to prevent two concurrent inserts bypassing the cap.
 perform 1 from public.platform_venues where id=new.venue_id for update;
 select count(*) into admin_total from public.platform_venue_staff
 where venue_id=new.venue_id and role in ('owner','admin')
;
 if tg_op = 'UPDATE' and old.role in ('owner','admin') and old.venue_id = new.venue_id then admin_total := admin_total - 1; end if;
 if admin_total >= 5 then
  raise exception 'This venue already has five administrators (including the owner).' using errcode='23514';
 end if;
 return new;
end;
$$;
drop trigger if exists platform_five_admins_guard on public.platform_venue_staff;
create trigger platform_five_admins_guard before insert or update of role,venue_id
on public.platform_venue_staff for each row execute function public.platform_limit_five_admins();
-- Inspect existing over-limit venues before expecting the cap to reflect historical data.
-- select venue_id,count(*) from public.platform_venue_staff
-- where role in ('owner','admin') group by venue_id having count(*)>5;
commit;
