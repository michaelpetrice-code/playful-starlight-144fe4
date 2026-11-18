
-- THE LOCAL V41: RUN AFTER V40 SAFETY-REPORTING-SETUP.sql
-- Existing V40 policies are removed and replaced with least-privilege controls.
begin;
drop policy if exists "Approved committee update safety reports" on public.local_safety_reports;
drop policy if exists "Approved committee view safety reports" on public.local_safety_reports;
drop policy if exists "Members submit own safety reports" on public.local_safety_reports;
revoke all on public.local_safety_reports from anon, authenticated;
grant insert (id,reporter_id,category,location,subject,details,urgent) on public.local_safety_reports to authenticated;
grant select (id,created_at,category,location,subject,details,urgent,status,committee_notes,reporter_id) on public.local_safety_reports to authenticated;
-- No direct UPDATE or DELETE grants. Review changes use a restricted function.
create policy "Safety submit own report v41" on public.local_safety_reports for insert to authenticated
with check (reporter_id=auth.uid() and status='New' and committee_notes='');
create policy "Safety committee read v41" on public.local_safety_reports for select to authenticated
using (exists(select 1 from public.local_safety_committee c where c.user_id=auth.uid()));
create table if not exists public.local_safety_audit (
 id bigint generated always as identity primary key,
 report_id uuid not null references public.local_safety_reports(id) on delete cascade,
 reviewer_id uuid not null references auth.users(id),
 changed_at timestamptz not null default now(),
 old_status text not null,
 new_status text not null,
 note_updated boolean not null default false
);
alter table public.local_safety_audit enable row level security;
revoke all on public.local_safety_audit from anon,authenticated;
grant select on public.local_safety_audit to authenticated;
create policy "Safety committee audit read" on public.local_safety_audit for select to authenticated
using (exists(select 1 from public.local_safety_committee c where c.user_id=auth.uid()));
create or replace function public.review_local_safety_report(p_report_id uuid,p_status text,p_notes text)
returns void language plpgsql security definer set search_path='' as $$
declare old_row public.local_safety_reports%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.local_safety_committee where user_id=auth.uid()) then
   raise exception 'Committee permission required';
 end if;
 if p_status not in ('New','Under review','Action taken','Closed') or length(coalesce(p_notes,''))>2000 then
   raise exception 'Invalid review';
 end if;
 select * into old_row from public.local_safety_reports where id=p_report_id for update;
 if not found then raise exception 'Report not found'; end if;
 update public.local_safety_reports set status=p_status,committee_notes=coalesce(p_notes,'') where id=p_report_id;
 insert into public.local_safety_audit(report_id,reviewer_id,old_status,new_status,note_updated)
 values(p_report_id,auth.uid(),old_row.status,p_status,old_row.committee_notes is distinct from coalesce(p_notes,''));
end $$;
revoke all on function public.review_local_safety_report(uuid,text,text) from public,anon;
grant execute on function public.review_local_safety_report(uuid,text,text) to authenticated;
-- Private evidence bucket; files remain inaccessible to public URLs.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('local-safety-evidence','local-safety-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists "Reporter upload own evidence" on storage.objects;
drop policy if exists "Committee read safety evidence" on storage.objects;
create policy "Reporter upload own evidence" on storage.objects for insert to authenticated
with check(bucket_id='local-safety-evidence' and (storage.foldername(name))[1]=auth.uid()::text
and exists(select 1 from public.local_safety_reports r
where r.id::text=(storage.foldername(name))[2] and r.reporter_id=auth.uid()));
create policy "Committee read safety evidence" on storage.objects for select to authenticated
using(bucket_id='local-safety-evidence' and exists(select 1 from public.local_safety_committee c where c.user_id=auth.uid()));
commit;
-- Retention: define and apply a club-approved schedule separately; never purge open cases automatically.
-- Escalation: urgent flag is visible in committee inbox but is NOT an automated notification.
-- Committee account management: use verified Supabase auth.users UIDs; do not add public insert policies.
