-- Optional activation AFTER football credentials and FOOTBALL_SYNC_SECRET are configured.
-- Run on the intended project only. Store two values in Supabase Vault first:
-- football_service_url: the deployed football-service URL for this same project
-- football_sync_secret: the same random value as Edge secret FOOTBALL_SYNC_SECRET
-- Never paste either secret into public source. This file contains no credentials.
-- Requires pg_cron and pg_net. No external requests are sent until the two Vault entries exist.
select cron.schedule('the-local-football-scores','* * * * *',$job$
 select net.http_post(
   url:=u.decrypted_secret,
   headers:=jsonb_build_object('Content-Type','application/json','x-football-sync',s.decrypted_secret),
   body:='{"action":"cron"}'::jsonb,
   timeout_milliseconds:=50000
 )
 from vault.decrypted_secrets u cross join vault.decrypted_secrets s
 where u.name='football_service_url' and s.name='football_sync_secret'
 and u.decrypted_secret ~ '^https://[a-z0-9]+\.supabase\.co/functions/v1/football-service$';
$job$);
-- Suspend this job without deleting league data:
-- select cron.unschedule('the-local-football-scores');
