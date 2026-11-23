-- Confidential reports: submitter-owned INSERT, owner/approved-reviewer SELECT, no direct client edits.
create table public.local_safety_committee(user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.local_safety_committee enable row level security;
revoke all on public.local_safety_committee from public,anon,authenticated;grant all on public.local_safety_committee to service_role;
create policy "Service manages approved safety reviewers" on public.local_safety_committee for all to service_role using(true) with check(true);
create function public.local_can_review_safety() returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and (public.local_is_owner() or exists(select 1 from public.local_safety_committee where user_id=auth.uid()))$$;
revoke all on function public.local_can_review_safety() from public,anon;grant execute on function public.local_can_review_safety() to authenticated;
create table public.local_safety_reports (
 id uuid primary key default gen_random_uuid(),reporter_id uuid not null references auth.users(id),created_at timestamptz not null default now(),category text not null check(length(category) between 3 and 100),location text not null check(length(location) between 1 and 180),subject text not null default '' check(length(subject)<=160),details text not null check(length(details) between 15 and 4000),urgent boolean not null default false,status text not null default 'New' check(status in ('New','Under review','Action taken','Closed')),committee_notes text not null default '' check(length(committee_notes)<=2000)
);
alter table public.local_safety_reports enable row level security;
revoke all on public.local_safety_reports from public,anon,authenticated;
grant insert(id,reporter_id,category,location,subject,details,urgent) on public.local_safety_reports to authenticated;
grant select on public.local_safety_reports to authenticated;grant all on public.local_safety_reports to service_role;
create policy "Members submit confidential reports" on public.local_safety_reports for insert to authenticated with check(reporter_id=(select auth.uid()) and status='New' and committee_notes='');
create policy "Only approved reviewers read reports" on public.local_safety_reports for select to authenticated using(public.local_can_review_safety());
create function public.local_owns_safety_report(p_report_id uuid) returns boolean language sql stable security definer set search_path='' as $$select auth.uid() is not null and exists(select 1 from public.local_safety_reports where id=p_report_id and reporter_id=auth.uid())$$;
revoke all on function public.local_owns_safety_report(uuid) from public,anon;grant execute on function public.local_owns_safety_report(uuid) to authenticated;
create table public.local_safety_audit(id bigint generated always as identity primary key,report_id uuid not null references public.local_safety_reports(id),reviewer_id uuid not null references auth.users(id),changed_at timestamptz not null default now(),old_status text not null,new_status text not null,note_updated boolean not null default false);
alter table public.local_safety_audit enable row level security;revoke all on public.local_safety_audit from public,anon,authenticated;
grant select on public.local_safety_audit to authenticated;grant all on public.local_safety_audit to service_role;
create policy "Reviewers read safety audit" on public.local_safety_audit for select to authenticated using(public.local_can_review_safety());
create function public.review_local_safety_report(p_report_id uuid,p_status text,p_notes text) returns void language plpgsql security definer set search_path='' as $$
 declare old_row public.local_safety_reports%rowtype;begin
 if not public.local_can_review_safety() then raise exception 'Reviewer permission required' using errcode='42501';end if;
 if p_status not in ('New','Under review','Action taken','Closed') or length(coalesce(p_notes,''))>2000 then raise exception 'Invalid review';end if;
 select * into old_row from public.local_safety_reports where id=p_report_id for update;if not found then raise exception 'Report not found';end if;
 update public.local_safety_reports set status=p_status,committee_notes=coalesce(p_notes,'') where id=p_report_id;
 insert into public.local_safety_audit(report_id,reviewer_id,old_status,new_status,note_updated) values(p_report_id,auth.uid(),old_row.status,p_status,old_row.committee_notes is distinct from coalesce(p_notes,''));
 end;
$$;
revoke all on function public.review_local_safety_report(uuid,text,text) from public,anon;grant execute on function public.review_local_safety_report(uuid,text,text) to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('local-safety-evidence','local-safety-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']);
create policy "Members upload own case evidence" on storage.objects for insert to authenticated with check(bucket_id='local-safety-evidence' and case when (storage.foldername(name))[1]=(select auth.uid())::text and (storage.foldername(name))[2] ~ '^[0-9a-fA-F]{8}-(?:[0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$' then public.local_owns_safety_report(((storage.foldername(name))[2])::uuid) else false end);
create policy "Only reviewers read case evidence" on storage.objects for select to authenticated using(bucket_id='local-safety-evidence' and public.local_can_review_safety());
create function public.local_administration_roles() returns jsonb language sql stable security definer set search_path='' as $$select jsonb_build_object('applications',auth.uid() is not null and public.local_is_owner(),'safety',auth.uid() is not null and public.local_can_review_safety())$$;
revoke all on function public.local_administration_roles() from public,anon;grant execute on function public.local_administration_roles() to authenticated;
