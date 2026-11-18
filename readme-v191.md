# The Local v191 — Consolidated Games Room

Complete website build based on v190.

- A single consolidated Games Room page (`games-room-next.html`) with a 14-game illustrated gallery, unique bundled SVG preview per game, category filtering and search.
- Tap any card to open the corresponding existing playable game in the same page, with a back-to-library button. The original games and coach remain intact.
- Responsive two-column mobile gallery, keyboard accessible game cards, lazy-loaded images, reduced-motion support.
- No external image dependencies or SQL changes.

## Important limitations
This release rebuilds the Games Room **layout and visuals**, not all fourteen game engines. It does not deliver realistic 3D simulation, full professional pool/snooker rules, or verified multiplayer. Those require separate development and end-to-end gameplay tests. SVG previews are original stylised illustrations, not actual in-game screenshots. The site has not been deployed or live-tested.

## Deploy
Back up existing Netlify deployment and upload the entire ZIP to the correct The Local site. Open `/games-room-next.html` and verify cards, search, filters, and gameplay on desktop and phone.
