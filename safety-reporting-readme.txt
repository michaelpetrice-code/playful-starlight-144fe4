THE LOCAL v40 - SAFETY, DEI AND COMMITTEE REPORTING

1. Open your THE LOCAL Supabase project (not Coombe Social Club's separate project).
2. Run SAFETY-REPORTING-SETUP.sql in SQL Editor.
3. Find each trusted committee reviewer's UUID in Authentication > Users.
4. Add each verified UUID to local_safety_committee via SQL Editor.
   Example: insert into public.local_safety_committee(user_id) values ('actual-user-uuid');
5. Deploy the entire lads-local-pwa directory to Netlify.
6. Test submitting a report as a member and viewing/updating it as an approved reviewer.
7. Confirm ordinary members cannot view the Committee Safety inbox.

Important operational considerations:
- Reports are confidential to committee reviewers but not anonymous.
- The committee should establish moderation procedures, retention periods and appeal processes.
- Urgent reports are marked but do not currently send push/email alerts.
- Reports should be checked regularly; this is not an emergency service.
- The SQL committee UPDATE policy should be tightened before production to prevent edits to original report details.
- Do not promise absolute confidentiality where legal disclosure or safeguarding duties apply.
