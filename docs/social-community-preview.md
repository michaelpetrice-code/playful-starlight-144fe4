# The Local social community redesign — development preview

This change is a development proposal. Do not merge or deploy to the live domain without Michael’s explicit publication instruction.

## Included
- Shared dark-green/gold mobile and desktop design with restrained surface depth.
- Desktop left navigation, a central feed and a right sidebar of the current member’s approved tables and community plans. Existing table chat can open in a desktop dock; its expand control returns to the full conversation.
- Existing mobile bottom navigation and chat/keyboard handling remain in use.
- All 22 feature groups have visible catalogue cards for visitors and members. Free personal membership is distinguished from venue subscriptions, tickets and optional paid services. Venue-dependent features are qualified.
- Visitor information is available on the welcome screen and guest home without sign-in. Existing login, registration and guest routes are preserved.
- Administration remains permission-gated. No database, role, billing or notification-permission changes are included.
- Sidebar data is limited to approved membership and existing database access controls; account changes clear the sidebar and dock, and stale asynchronous responses are discarded.

## Preview
`social-preview.html` renders the shared components with labelled illustrative content, without loading config, signing in or writing data. `?mode=member` shows the member layout. The actual `index.html` and `guest.html` contain the integrated implementation. No fake posts, member totals, online indicators or stories have been inserted into the live data or member feed.

## Verification and limits
Run the static checks, JavaScript syntax checks and complete automated suite. Additional DOM tests cover catalogue visibility and route safety, view/draft preservation, management visibility, account isolation and untrusted table-name escaping. Browser review is required before publication. Real two-account chat, a physical Samsung keyboard, video/calling, venue publishing, ticket payments and all multiplayer modes are not certified by this visual redesign. Legacy service gaps from the earlier audit remain separate work.

The AI pictures are design direction, not exact screenshots. The implementation uses existing working features; story creation, public follower graphs and new social networks have not been invented as placeholder controls.

## Professional depth finish
The development branch applies `professional-depth.css` consistently across all 16 existing HTML entry points (including the administration redirect), plus both design previews. It adds raised dark surfaces, fine gold edges, inset form fields, restrained button bevels, consistent focus and disabled states, and polished header/navigation panels. Branded venue previews and game boards are excluded from the shared component treatments. Reduced-motion and forced-colour preferences are respected. This remains unpublished development work.
