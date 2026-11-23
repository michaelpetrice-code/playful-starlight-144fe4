# Venue marketing and Race Night

Marketing Studio: `/venue-marketing.html`. Race Night: `/race-night/index.html`.

The edge function `venue-marketing` authenticates confirmed Supabase users itself. It uses the existing service-only managed-venue resolver and separate complimentary marketing grants. Browser clients cannot write grants, campaign/usage records or checkout records. Only published announcements for approved venues are readable by signed-in members.

Deploy `server/index.ts` and `core.mjs` together, keeping the relative import. Required server environment: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY. Stripe uses existing live STRIPE_RESTRICTED_KEY; optional MARKETING_AI_MODEL defaults to gpt-5-mini via QUIZ_AI_MODEL. Never put private keys in this repository or client config.

AI campaigns and host-guide requests share an atomic 50-request per venue per UTC calendar month allowance, with failed requests restoring quota. Host guidance uses counts/question only, not footage or guest slips. No AI output posts automatically. Checkout is disabled when the AI key is missing. Michael's personal and Coombe's venue grants are permanent and bypass payment, not fair-use allowance. Configure server secrets in Supabase Edge Functions → Secrets.

Race Night uses local File objects and same-device BroadcastChannel windows. No race videos are bundled or uploaded. HDMI/extended desktop or device mirroring is needed for a venue display. The host must reselect files after closing the page. Course names are selectable folders, not claims of an included licensed race catalogue.

Printable guest cards list only courses with imported footage. Card race order is planned manually; the host follows it when choosing random races. Runner/trap numbers must be checked against the recordings. Selection, stake, result and return fields are handwritten. The app does not accept/process wagers, set odds or calculate payouts.

Validation: `npm ci --prefix tests --ignore-scripts`, then `node --test race-night/tests/*.mjs venue-marketing/tests/*.mjs` and `python scripts/check_static.py`. Live authenticated AI response, paid purchase, actual historic footage and physical TV output require separate end-to-end verification; do not claim them from static/DOM tests.
