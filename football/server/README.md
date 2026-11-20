# Football service activation

Do not place API secrets in config.js, client JavaScript, source control, browser local storage or PR comments.

## Optional secrets for provider and paid AI activation

| Secret | Purpose |
| --- | --- |
| FOOTBALL_DATA_API_KEY | A football-data.org key with appropriate competition and score coverage |
| OPENAI_API_KEY | OpenAI API key for the Gaffer, backed by the owner's approved API budget |
| FOOTBALL_AI_ENABLED | Set to true only when the owner is ready to enable model usage |
| FOOTBALL_AI_MODEL | Optional; defaults to gpt-5-mini |
| FOOTBALL_SYNC_SECRET | A new random shared secret for scheduled background sync |

Supabase supplies SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in the Edge runtime. These are not copied into client code.

Deploy football-service with entrypoint server/index.ts and files ../rules.mjs and ../service-model.mjs. The platform JWT gateway check is off because the function performs its own auth: every member POST validates the JWT with Supabase Auth and checks approved league membership through the user-scoped RPC; import requires owner role. The cron route requires the shared sync secret. GET exposes configuration booleans only. OPTIONS only returns CORS headers.

Use the GET response to verify configuration without exposing key values. Then check a real future matchday import on a covered competition, score refresh, final-result settlement and a genuine Gaffer response with a signed-in staging player. Verify an uncovered competition and a provider outage retain prior state. Provider plan delays must be reflected honestly in marketing.

Default safeguards: at most eight upstream football requests per minute across the application, shared cache leases, one completed Gaffer verdict per player/round, at most two attempts per round, five attempts per player/day and one hundred attempts/day globally. Tokens are bounded per request. These limits are not a guaranteed monetary spending cap; configure an appropriate provider account budget before enabling.

For unattended operation, create Supabase Vault entries football_service_url and football_sync_secret (the latter must match the Edge secret), then apply scheduler.sql after verifying pg_cron and pg_net are available. It checks each minute; requests share the provider cache. No scheduler was activated while credentials were missing.

Before production: finish the provider/AI/scheduler end-to-end tests, apply the reviewed installer to the confirmed production project, deploy the function and required secrets to that same project, and deploy the tested static branch. Do not swap existing project URLs or auth keys as a shortcut.

References: https://docs.football-data.org/general/v4/competition.html and https://docs.football-data.org/general/v4/policies.html ; https://supabase.com/docs/guides/functions/secrets ; https://developers.openai.com/api/reference/resources/responses/methods/create .

Free production mode is active as of 20 November 2026: manual fixtures/results and the local recorded-results Gaffer guide need none of the optional secrets. Keep paid AI disabled unless separately authorised with an API budget. Automated provider-score activation remains pending a data key and provider/scheduler end-to-end checks.
