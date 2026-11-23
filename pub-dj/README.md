# The Local DJ

Venue music software with a hosted customer queue, Spotify-style discovery and responsive DJ decks. The song sits beside the console on desktop; below 720px the console stacks underneath. The B platter shows the upcoming song rather than a second audio channel. No crossfade, beat matching, AI music generation or commercial streaming catalogue is advertised.

## Published routes

- `pub-dj-pro.html`: plans, music requirements and hosting entry.
- `pub-dj/index.html`: hosted DJ, Local account sign-in and guest-code entry.
- `pub-dj/index.html?demo=1`: interactive original-sample demo; its state stays in that tab.
- `pub-dj/index.html?room=CODE`: shared queue join link.
- Add `screen=1` for a silent display; screen views cannot control playback.

## Venue hosting

Sign in with an existing confirmed Local account. The hosted backend derives venue-management access from the platform-owner registry, App Builder ownership/team membership, verified venue owners and Coombe's registered hosts. A private party needs no venue. Complimentary personal and venue grants are checked server-side before any payment request. Michael's owner account and Coombe have permanent grants requiring no payment card.

Select the approved venue or private event, then open a room with existing access or use Stripe checkout. Choose authorised music files on the host device, confirm permission to use them, and select Use selected music. Filename convention: `Artist - Song title - Mood.mp3`; unlabelled files use their filenames. Up to 500 MP3, WAV, OGG or M4A files, 50 MB per file. Codec support depends on the host browser. Only metadata is sent to the service, never the audio files.

Claim playback on exactly one device and press Start. A subsequent claim stops the old host audio on its next successful poll (normally three seconds). The host tab must remain open and the device awake. Reloading loses file handles: reselect the same files, then reclaim playback. Reselecting existing tracks preserves their queued requests. Approved songs play in vote order, oldest first for ties; the chosen background mix fills empty queues. Volume, seek and pause are local to the designated host; guests do not receive a fictitious synchronised playhead.

Guests use a six-digit code or join link, without an account or download. Sessions are per browser tab and room. Guests submit up to three requests in ten minutes; staff approve them; a guest session can vote once per approved request. Room-code join attempts are limited to twenty per IP per minute and rooms to 500 guest sessions. These anonymous controls are not identity-based fraud prevention and codes do not prove physical presence. Rooms close after twelve hours. Guests cannot call privileged database functions or read private tables.

## Pricing and verified access

- Venue Monthly: £19.99/month, one approved venue.
- Local Subscriber Add-on: £9.99/month, verified active paid Local venue subscription required throughout.
- Party Pass: £7.99 once, one room of up to twelve hours, activated within thirty days. Room closure is capped at the pass expiry.
- Guest requesting and voting are free.

These are software charges. Music supply and public-performance/recording permissions are separate. The original short sample recordings included in `demo/` may be used to try the controls. No third-party songs or streaming credentials are bundled.

`cloud/index.ts` uses the existing live restricted Stripe secret in the deployed environment. No secret appears in this repository. It checks active live GBP prices, product tier, exact amounts and recurrence. Server leases and Stripe idempotency prevent parallel checkout creation; an existing open checkout is reused. Checkout completion redirects do not grant access. Creating/reopening a room validates the stored purchaser's Stripe Checkout Session, line items, live mode, amount, customer subscription, latest paid invoice, PaymentIntent and Charge. Refunded or disputed payments do not grant new access. A room's host entitlement is rechecked on polling, with a maximum two-minute cached verification for paid sessions. These checks are performed on demand rather than through a webhook; an unattended tab does not proactively poll subscriptions. Subscription cancellations are available in Manage DJ billing.

No real payment has been submitted by the development agent. Automated tests cover positive and negative billing fixtures; production status verifies price/read permissions. A real completed customer payment and a venue-speaker/device check are separate acceptance checks.

## Hosted service

`cloud/install.sql` defines the tables and trusted-service RPCs. Tables have RLS enabled, browser-role grants revoked and service-role grants limited to the server. The Edge Function verifies host tokens through Auth, checks confirmed accounts and entitlement, and hashes anonymous guest secrets. `local_dj_command` serialises room changes under a row lock. A claimed playback client is required for stop/next. Browser code cannot change grants or forge purchaser IDs. Expired rooms are inaccessible; retention/cleanup of old queue data should be configured as usage grows.

Environment: existing `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`; live `STRIPE_RESTRICTED_KEY` (or `QUIZ_STRIPE_KEY` fallback). The function performs its own host/guest authentication, so the gateway JWT check is disabled. CORS allows The Local's production domains and this repository's Netlify deploy previews.

Deploy the `local-dj` Edge Function with `index.ts` and `billing-core.mjs`. Apply database schema changes through migrations. `billing-launch-status.json` contains non-secret catalogue IDs. The existing venue and quiz billing functions are unchanged.

## Local-network alternative

The independent `server.py` remains available for a local Python 3.10+ venue pilot. Set a strong 12+ character `DJ_HOST_PASSWORD`, optional six-digit `DJ_JOIN_CODE`, `DJ_VENUE` and `DJ_MUSIC_DIR`, then run `python3 pub-dj/server.py`. It defaults to localhost port 8787 and stores its own SQLite queue under `pub-dj/data`. `DJ_BIND=0.0.0.0` makes it reachable on a trusted LAN; do not expose its development HTTP server directly to the internet. This independent pilot uses a staff password and does not consume hosted billing entitlements.

## Verification

```sh
npm ci --prefix tests --ignore-scripts
node --test pub-dj/tests/*.cjs pub-dj/tests/*.mjs
python3 -m unittest discover -s pub-dj/tests -v
node --check pub-dj/app.js
node --check pub-dj/cloud/index.ts
```

The suite checks billing failures, guest restrictions, queue/voting behavior, playback controls, saved songs/search, DOM interaction and served scripts. Live database assertions check owner/Coombe grants, guest moderation rejection, unique votes, catalogue retention and playback-client enforcement. DOM tests use Happy DOM; they do not replace actual mobile and speaker testing.

Search includes an explicit submit button, Enter support and catalogue suggestions with arrow-key navigation. Music Assistant uses the server-side OPENAI_API_KEY (optional DJ_AI_MODEL, default gpt-5-mini). Joined guests/authorised hosts can ask about the current room catalogue. Apply cloud/assistant.sql before deploying index.ts. AI requests are capped atomically at 100 per room and rate-limited; failed provider requests count towards this cap. No AI action submits requests or controls playback. Demo/local mode explicitly uses deterministic catalogue matching. AI requires room membership and never returns song IDs outside the current catalogue.

Free online supplier: Incompetech / Kevin MacLeod, a curated 12-track CC BY 4.0 production-music collection. Official metadata checked 23 November 2026 from https://incompetech.com/music/royalty-free/pieces.json, attribution requirements from its licensing page and FAQ. Audio URLs were range-tested (HTTP 206); playback must also be browser-tested. No chart music is supplied. free-music.js is shared by browser and edge function; deploy it beside index.ts and billing-core.mjs. New rooms start with this collection. Existing room hosts can replace their collection with the free collection. Attribution and source links remain visible on the DJ page and projector. Recordings are streamed from the creator; normal connectivity/hosting/AI costs and venue permissions are separate.

Expanded source catalogue (23 November 2026): 400 Incompetech selections plus ccMixter Attribution-licensed selections with named contributor credits, and Audionautix tracks subject to browser playback verification. New room defaults are capped at the existing 500-track room limit. Source/genre filters and 48-item pages keep rendering bounded. The AI assistant ranks genre/tag matches before sending at most 60 candidates to the model; it does not browse arbitrary websites or grant rights. Deploy discovery.js beside free-music.js, index.ts and billing-core.mjs. The weekly GitHub workflow writes candidate reports as artifacts and never auto-approves or publishes new tracks. Existing ChatGPT scheduled tasks are unchanged because the user chose to retain all five.

Final playback acceptance: 401 connected recordings: 400 Incompetech and Acoustic Rock by Jason Shaw/Audionautix. Audionautix Acoustic Rock decoded and advanced in the browser (166.9 seconds). ccMixter Connections, Audionautix Big Swing Band and Dirt Road Traveler failed browser playback and were removed from the playable catalogue. Deferred source/track records are in source-review-records.json. Automated checks write candidates only; AI-assisted review is not an autonomous licence grant or auto-publication.

Weekly AI source reviews authenticate to local-dj using GitHub OIDC: exact repository/main branch/workflow_ref, schedule or workflow_dispatch only, fixed audience, issuer, RS256 signature and token age verified against GitHub public JWKS. No OpenAI key is exported to GitHub. Deploy source-review-policy.mjs with the edge files. Reviews are advisory artifacts; no track or licence is auto-approved. The weekly AI call uses the existing OpenAI account and incurs normal API usage.

GitHub uses a customised OIDC subject for this repository. Review authorization therefore requires signed immutable repository_id 1463307927 plus exact repository, ref, workflow_ref and event, rather than assuming GitHub default sub formatting. Issuer, audience, algorithm, expiry and token age are still verified.
