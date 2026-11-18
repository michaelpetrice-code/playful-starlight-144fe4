# The Local — AI Audit and Controlled Rebuild

## Current source findings (18 November 2026)

- The GitHub default branch is `main`. This branch is treated as protected **by process**: proposed changes go through a separate branch and pull request.
- `guest.html` already contains a twelve-tile gallery. It links to guest routes for venues, events, marketplace, tables, games, trades, challenges, rewards, rounds, friends, photos, and tickets.
- `guest.js` currently gives public browsing functionality to the venue directory, events and marketplace teaser. The other nine feature routes are informative previews with sign-in prompts. Therefore **twelve visible tiles does not mean twelve fully implemented guest experiences**.
- The existing `games-room-next.html` explicitly states that cue sports use 2D practice physics but lack a full referee or complete official rules, and online competitive play is not verified.
- `games-room-next.js` includes 14 single-player game selections, but the feature descriptions and game handlers must be audited independently before claiming gameplay is correct.
- The repository is public. `config.js` contains a Supabase publishable key, which is designed to be public; the database's row-level security and storage permissions still require proper verification. Never place service-role/secret keys in the repository.
- The repository alone does not prove the Netlify staging site is connected to Git deployments. Deployment must be verified in Netlify.

## Release safeguards

1. Do not change `main` or live production without approval.
2. Do not run SQL migrations, edit payment settings, or alter member data during static code review.
3. No automatic merge. Use reviewed pull requests.
4. Do not describe a game as fully working until interactive, rule and regression tests pass.
5. Keep guest content strictly public; do not bypass existing authentication to expose private data.

## Ordered repair plan

### Priority A — User experience and correct navigation
- Verify the full guest gallery after publish, including all twelve tiles and responsive layout.
- Confirm authenticated users retain sessions, and guests are never silently treated as signed-in.
- Offer direct access to genuinely public game modes only after validating data boundaries.
- Fix poor contrast and misleading text on the sign-in page, while retaining the working guest CTA.

### Priority B — Commercial administration
- Audit venue roles and Supabase RLS per venue.
- Simplify venue admin invitations using verified email workflows.
- Verify subscription activation against trusted Stripe webhooks, not client-side claims.

### Priority C — Game engines
- Inventory game handlers and isolate engine/rules/UI for each game.
- Add deterministic unit tests for cue physics, turn state and fouls; verify collisions, spin and pocket detection.
- Add accurate darts scoring, bust/checkout, and AI testing.
- Validate existing strategy/card/puzzle games independently.
- Introduce server-authoritative multiplayer only after its real-time model and permissions pass security tests.

### Priority D — CI and automation
- Add read-only/static checking in GitHub Actions once the test runner is selected.
- Connect Netlify to GitHub with branch previews and a separate production approval process.
- Report pass/fail/untested separately and publish evidence in pull requests.

## Test matrix (not yet executed)

| Area | Status | Required evidence |
|---|---|---|
| Existing guest gallery source | Inspected | Browser screenshot and click-through |
| Public venues/events/marketplace | Source inspected | Live test of public records |
| Nine additional guest feature previews | Source inspected | UX test of sign-in prompts |
| Login/session restoration | Untested | Fresh and returning user test |
| Supabase RLS/storage | Untested | Authorised test accounts and policies |
| Owner/venue administration | Untested | Role-based integration tests |
| Stripe onboarding | Untested | Test-mode webhook tests |
| Games and AI | Untested | Automated rules and play sessions |
| Online multiplayer | Untested | Two-client verified state test |
| Netlify Git integration | Unverified | Build settings and preview deployment |

## Working convention

This document establishes the baseline. Code changes should occur in small branches against the current repository, with clear diffs, tests, rollback information, and user approval before release.
