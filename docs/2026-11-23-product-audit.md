# The Local product audit — 23 November 2026

## Scope and verified changes
Reviewed the 16 public HTML entry points, 70 reachable JavaScript modules, live database schema and access policies, notification infrastructure and feature routes. All 16 public pages responded HTTP 200. Source and DOM checks do not establish Facebook parity or complete signed-in acceptance.

- Unified dark green/charcoal surfaces, fine gold borders, readable placeholders and a restrained 3D finish: soft shadows, inset highlights and small button bevels. Reduced-motion and larger-text preferences are available.
- Messages is a primary navigation destination. More groups features with search; browser Back/Forward restores the previous page, scroll and eligible text drafts.
- Private chats use a bounded message history and persistent composer; incoming updates preserve typing and older-message reading position. Keyboard resizing is handled through visualViewport where supported. Table drafts are retained in account-scoped memory. Drafts are cleared on identity changes; passwords and sensitive forms are excluded.
- Table frames stay mounted on refresh, while a different table selected through history mounts the correct conversation. Conversation Back returns to its list.
- Repaired missing venue application/request services and public directory links. Coombe links to its existing standalone app; no published Coombe builder app was found.
- Added confidential safety reports and private evidence storage, with reviewer-only reading and audited review actions. Owner-only venue application decisions are audited.

## Validation
74 automated tests pass, including navigation/history, scroll and drafts, account separation, chat updates, duplicate-send protection, table access, notifications, football and existing game checks. Static assets and guest-route checks pass. These checks do not verify all 14 games in real multiplayer.

Live database transaction tests verified member submission, denial of unauthorized review/approval, owner approval and confidential report access boundaries. Test transactions were rolled back. Safety evidence storage is private; malformed folder names cannot break unrelated storage uploads.

## Remaining work and limits
The source still references legacy or unfinished administration/content-studio RPCs, member moderation services, legacy venue-control tables, member/table game services and older cue/darts multiplayer schemas that are absent from the live database. These paths need dedicated migrations and signed-in acceptance before being described as complete. Existing modern builder and server-authoritative game services are separate from those legacy paths.

No real handset was registered for native push at the audit baseline. Notification infrastructure exists, but actual phone receipt remains unverified and requires the member to allow notifications. Real paid Stripe transactions, venue publication, two-account messaging, video/live streaming and the complete signed-in journey were not exercised with real users in this audit. A sample-data UI fixture is provided for visual review only.

Database security advisors flag existing callable security-definer functions and RLS tables without policies. Service-only tables can intentionally have no client policies; public APIs can intentionally be callable. Each requires an access review rather than blanket revocation. Leaked-password protection is disabled and should be enabled when supported by the project's authentication plan.

- [Anonymous function access guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Authenticated function access guidance](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)

## Deployment
GitHub's connected Netlify project and the custom-domain manual-upload project are separate. Production publication must explicitly update the custom-domain project after the tested GitHub change is merged. Do not infer custom-domain publication from GitHub CI alone.
