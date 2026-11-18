# The Local v189 — Owner Maintenance & Growth Copilot

Adds an owner-only assistant to the existing Platform & Members owner dashboard. The assistant reads the existing aggregate `local_owner_metrics` RPC, prioritises pending venue applications and safety/moderation work, prepares a copyable owner review, and provides practical fallback guidance.

For genuine generative AI, deploy the new Supabase Edge Function `local-owner-copilot` and set the Supabase function secret `OPENAI_API_KEY` (optional `OPENAI_OWNER_MODEL`). The function authenticates the user and checks `local_is_owner` before calling the AI API. No new SQL required. The UI works without this deployment, using labelled rule-based recommendations.

**Approval controls:** Read-only; never deploys, edits content, publishes posts, charges users, or changes membership. Suggestions must be manually approved and acted upon in existing management tools. No scheduled monitoring or automatic fixes. It does not inspect site health, payments, logs, source code, or private messages. Owner dashboard numbers are snapshots.

Install: Back up your site; upload the full ZIP to Netlify. Deploy the optional Edge Function separately if generative recommendations are desired. Test with an authorised owner account. No live deployment or end-to-end tests performed.
