# The Local football clubhouse

A branded replacement for the basic Football predictions form. Original artwork and The Local identity; no EliminX artwork or branding copied. Existing prediction records remain visible beneath the new member page.

## Implemented

- Last Man Standing private/shared leagues, invitations, owner approval before the first deadline, separate staff roles, and league switching.
- Server-side pick deadlines, kickoff locking, one team per round, no team reuse, win/draw/loss/no-pick adjudication, postponed/suspended/cancelled match waiting, round history and winners.
- Configurable all-out rollover, fixed once picks begin; used teams remain used. Optional venue reward description; free entry with no payments handled.
- Six themes, resized PNG/JPEG/WebP logo upload, private/public visibility and vanity links through `football.html?league=your-slug`.
- Public views expose display names and post-deadline picks, with ordinal player identifiers. Account UUIDs, invitation codes, messages and private notifications are not exposed, including in round history.
- Banter with mentions, moderation, join-request alerts, personal league updates and optional browser notifications while the page remains open. Background web push is not implemented or advertised.
- Vector QR invitations, A4/A5/table-tent print layouts, QR download, rotating TV scores/standings/statistics, team popularity and player history.
- Credential-ready football-data.org provider adapter with global request budget, cache leases, source/check timestamps, slate validation and automatic final-score settlement. Manual fixtures/results remain available, with no fake live data.
- Credential-ready AI Gaffer using provider fixtures and standings only, eligible-team checks, strict structured output, one completed verdict per player/round, two attempts per round, per-user/day and global/day request limits. Disabled until explicitly configured.
- Secure background-sync endpoint plus optional `scheduler.sql` activation script. The schedule is not installed; secrets are missing.
- Browser-local `football-demo.html` for a separate clearly labelled sample league.

## Deployment state — 20 November 2026

The free league release was published to The Local production at https://thelocal.me.uk on 20 November 2026, Netlify deployment `6b00371592a766b99f43fb4e`. The additive schema and football-service v1 are installed on production project `huuqwjmztqurnyyokrxd`; the existing auth configuration is preserved. Transactional production checks passed for league rules, roles, private/public data projection and provider/cache state handling, with all synthetic rows rolled back. Browser checks verified the production page, local sample sponsor save/render/QR poster and free form guide; sample changes were reset. Existing staging two-account QA is recorded below.

Manual fixtures/results and the local form guide require no paid account. Automatic provider scores remain unavailable without a data key. Paid AI is disabled and its controls are hidden unless configured. No scheduler, paid service, entry charge or automatic sponsor billing was enabled.

Coombe v64 is prepared, but its deployment needs access to its separate Netlify account. The Games Room 2.0 draft is outside this football release and remains incomplete.

## Validation

- 16 passing football rule/model tests; provider normalization, incomplete results, AI team validation, rollover/team reuse, HTML escaping, QR output and URL scopes.
- Invitation QR decoded independently with jsQR 1.4.0 back to the exact invitation URL.
- Two transactional staging SQL suites pass for roles, pick privacy, public privacy, cache, AI reservation/cache, mentions, provider deadline clamp, automatic settlement, rollover, next-round reset and team reuse. All their synthetic rows are rolled back.
- Two actual temporary staging Auth accounts used in browser: league creation, request/approval, separate picks, hidden opponent pick, shared mention/alert, public read-only route, theme/vanity link, resized logo persisted as PNG, manual final score and winner confirmation.
- Mobile iframe: 375 CSS-pixel content viewport inside a 390-pixel frame; no horizontal overflow. Desktop and rotating TV display inspected.
- Static site checks, venue-sector tests, existing cue physics/referee tests, JavaScript syntax and Edge Function TypeScript checks pass.
- Temporary browser QA accounts and league are removed after testing. No real member accounts or records are modified.

## Files and activation

`install-football.sql` is the consolidated idempotent installer. `database-test.sql` and `service-database-test.sql` are transactional tests. `server/index.ts` is the Edge Function, with `rules.mjs` and `service-model.mjs` as relative dependencies.

See `server/README.md` for credential activation and the production gate. Serve the repository to preview `football-demo.html`; `football.html` reuses the configured project's existing user session or serves a public league.

Security advisors reviewed: no direct-access RLS policies is intentional because table grants are revoked. The two callable security-definer APIs are intentional: authenticated actions enforce membership/roles, and public reads return an explicitly sanitized public-only projection. See https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable and https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable .

## Sponsorship and revenue (20 November 2026)
Owner-only league settings now support a sponsor name, message and HTTPS website. A disclosed advertisement appears on league pages, public league pages, printable invitations and TV screens. Blank sponsor name removes it. Sponsors cannot alter competition results. Public reads expose only those three additional commercial fields.

The Revenue section explains sponsor sales, optional venue spending and links to the existing venue subscription. Sponsorship contracts, pricing, expiry/removal and invoicing remain manually managed. No automatic income collection, platform commission, new billing product or paid entry has been activated. The example is gross arithmetic, not a forecast. Payments processing would carry transaction charges even without a monthly software subscription.

Paid prediction entry and prize-pool commissions are excluded pending specialist UK gambling advice: https://www.legislation.gov.uk/ukpga/2005/19/section/11 and https://www.gamblingcommission.gov.uk/licensees-and-businesses/licences-and-fees/remote-pool-betting-licence .

The consolidated installer is installed on staging and production. Sponsorship persistence and public projection were tested transactionally on staging; owner-only settings are covered by the shared role suite. Coombe has not been updated by this branch.

The sponsorship installer has now passed both existing transactional staging suites plus sponsor persistence, public projection and unsafe URL rejection checks. A free local Gaffer form guide uses archived final scores only; missing form remains explicitly unrated. Paid AI controls stay hidden unless already configured.

## Launch readiness fixes — 21 November 2026

- The standalone football page now puts free registration and sign-in in the hero, explains the device-only demo and links back to The Local.
- Added accessible Rules navigation with player and organiser guidance, and a setup shortcut for empty shared leagues.
- Private invitations open the joining screen even for members with an existing league. Football email confirmation returns preserve the football destination and valid invitation code.
- Saving a pick releases the busy state immediately, allowing a player to change it before the deadline. Removed the unsupported manual half-time status.
- Added football sharing metadata and four UI regression tests to GitHub Actions. Twenty football tests and existing static/venue checks pass locally.
- Read-only production checks confirm RLS on all three football tables, no direct member/anonymous table reads, authenticated-only league actions, public-only read projection and no member access to internal service/cache/settlement APIs. Production football-service v1 remains active.
- Database integration suites were attempted on the identified staging project xqgzdezcnkvjjbhsrofa but automatic approval review rejected synthetic Auth and league mutations. They were not rerun through another route. The prior recorded integration results above are historical, not new verification. No schema or Edge Function was changed by this release.
- Automatic provider scores, unattended sync and paid AI remain outside the free release until credentials and the corresponding end-to-end checks are available. No charges or subscriptions were enabled.
