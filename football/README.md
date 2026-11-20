# The Local football clubhouse — draft replacement

Original The Local branding and stadium artwork inspired by the reference's premium black-and-gold presentation. Does not copy EliminX assets or branding.

## Included

- Replaces the signed-in Football tab and preserves existing prediction records beneath it.
- Standalone `football.html` browser-local demo, explicitly labelled as demo fixtures, not live scores.
- Private shared leagues using the existing Supabase session, league creation/selection, invitation codes, owner approval before the first deadline, staff roles, six themes and organiser-entered fixtures/results.
- Server-side deadline enforcement, hidden opponent picks until deadline, one pick per round, no reuse of teams, win/draw/loss adjudication, no-pick elimination, postponed-match waiting, winner and all-out endings, round history.
- Banter wall with moderation and rate limiting, invitation link and printable text poster, TV view, 30-second shared refresh while not typing.
- Escaped user text, no public table access, authenticated RPC with per-action membership/role checks and row locking.

## Deployment state

On 20 November 2026 the additive SQL was applied ONLY to The Local staging project `xqgzdezcnkvjjbhsrofa`. Production was not changed. The repository's existing `config.js` still points to production `huuqwjmztqurnyyokrxd`; this change does not switch it or migrate any existing database.

Before integrating on production, complete the remaining features below, verify an actual two-account browser flow on staging, and apply the reviewed SQL to the confirmed production target. Never replace `config.js` with blank values. No Netlify production deploy or main-branch merge was performed as part of this draft.

`install-football.sql` is a consolidated installer. `database-test.sql` runs transactional integration checks and rolls back every synthetic test record. To preview locally, serve the repository and open `football.html`.

## Remaining to reach the requested reference's functionality

- Licensed football fixtures/live-score/form provider, server-side credentials, cache and provider error/stale-data handling; automated result settlement after verified finals.
- AI Gaffer grounded in that feed, budget and rate limits, one cached verdict per player/round, and verified eligible-team recommendations. Current tab explicitly says unavailable.
- QR poster generation (current poster contains the invitation URL as text), a custom venue-logo upload, public/private vanity league routes, TV auto-cycling, mentions/notifications, richer statistics, configurable rollovers and prize descriptions.
- Genuine browser checks with two signed-in staging accounts and mobile viewport. Browser-local pick submission and banter posting were verified; database access rules and settlement were verified separately.

No entry fees, payment collection or cash prizes are implemented. Existing venue subscriptions are unchanged. No claim of full feature parity or live-score availability is made.

## Validation on 20 November 2026

- `node --test football/rules.test.mjs`: 6 passing rule tests.
- `node --input-type=module --check < football/hub.js` and `app.js`: passing.
- `python3 scripts/check_static.py`: passing existing site asset/guest checks.
- Staging SQL: creation, approval, outsider denial, pick privacy, owner controls, posting, deadline, unplayed-result rejection, settlement and grants passed, all test rows rolled back.
- Supabase advisors reviewed: the football table deliberately has no direct-access policies; access is exclusively through the checked RPC. The advisor also reports that the authenticated security-definer RPC is callable, which is intentional; anonymous execution is revoked and membership/roles are enforced in the function. Unrelated pre-existing advisories were not changed.
