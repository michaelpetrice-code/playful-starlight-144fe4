# The Local DJ

Venue-managed music requests, staff approval, votes and host-device playback. The public UI lives at `/pub-dj/index.html`; room management uses the `local-dj` Supabase Edge Function and service-only database routines in `cloud/install.sql`. Hosting and Stripe access controls remain enforced on the server. Michael and Coombe retain their existing complimentary grants.

## Search without external AI

Search has a visible button and Enter submission, song/artist predictions with keyboard navigation, source and genre filters, and 48-track pages. The music helper uses local catalogue matching for song, artist, genre and mood requests, including simple mood synonyms. It makes no external AI request and needs no AI account, model key, credit balance or AI generation allowance. The legacy `assist` endpoint also uses catalogue matching after room authorization. Remote `catalogue-review` calls are retired (HTTP 410).

The server does not read OPENAI_API_KEY, call a model provider or use GitHub OIDC. Leave shared secrets for other platform features alone. Deploy index.ts, billing-core.mjs, free-music.js and discovery.js together. Supabase service/auth and Stripe environment variables are still needed for hosting/billing; this change does not remove those services.

## Free online recordings

401 connected recordings: 400 Incompetech selections by Kevin MacLeod and Acoustic Rock by Jason Shaw/Audionautix. No mainstream chart catalogue is included. Source, artist and licence attribution travel with every recording. Audio is unchanged and streamed from fixed creator-published URLs. New rooms include this collection; existing hosts can explicitly replace their collection with it. Hosts must keep attribution visible to listeners. Normal data/hosting and venue permissions are separate from the absence of supplier fees.

Audionautix Acoustic Rock decoded and advanced in the browser (166.9 seconds). ccMixter Connections, Audionautix Big Swing Band and Dirt Road Traveler failed browser playback and are excluded. Deferred records and licensing limitations are in `source-review-records.json`.

## Ongoing source checks

`.github/workflows/dj-source-review.yml` checks known supplier catalogues weekly and can be run manually. `scripts/check-music-sources.py` identifies new metadata candidates and writes `music-source-review.json` as an artifact. Deterministic reports flag required licence, contributor and playback checks; they do not approve rights or publish new tracks automatically. No AI call or AI secret is needed. The user's five existing ChatGPT tasks remain unchanged.

## Validation

Run `npm ci --prefix tests --ignore-scripts`, `node --test pub-dj/tests/*.mjs pub-dj/tests/*.cjs`, `python3 -m unittest discover -s pub-dj/tests -v`, and `python scripts/check_static.py`. Browser checks verify free-stream playback and staff request approval. Room polling reuses a hash-scoped catalogue cache, cleared when the room changes or the user signs out.
