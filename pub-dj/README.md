# The Local DJ — working venue pilot

A dark green and gold jukebox alternative for The Local. Includes a static interactive demo, three original short instrumental samples, a real multi-device venue queue, staff approval, voting, automatic next-track playback, mood-based fallback music and a separate silent screen view.

## Try the demo

Open `pub-dj/index.html` through any static web server. Use code **123456**, request a song, unlock demo staff controls and approve it, then start playback. Demo state stays in that tab; customer and staff controls are deliberately available for demonstration. Original samples are short loops and repeat as the queue advances. The demo is not shared between devices. The product page is `pub-dj-pro.html`.

## Run a real venue pilot

Requires Python 3.10+; no third-party packages. Start from the repository root:

```sh
export DJ_HOST_PASSWORD='replace-with-a-unique-long-password'
export DJ_VENUE='Coombe Social Club'
export DJ_JOIN_CODE='385217'
export DJ_MUSIC_DIR='/absolute/path/to/authorised/music'
python3 pub-dj/server.py
```

Visit http://127.0.0.1:8787. Staff log in using Staff controls. Customers join with the six-digit code. The server uses a persistent SQLite database in `pub-dj/data/dj.sqlite`; audio stays in the configured folder. Point `DJ_MUSIC_DIR` at `pub-dj/demo` for sample audio, though its simple filenames will appear without full song metadata. Never commit credentials, venue audio or the database.

For phones on a trusted private LAN, set `DJ_BIND=0.0.0.0` and visit the host computer’s LAN address on port 8787. Guest Wi-Fi isolation/firewall rules must allow this access. The host computer must remain awake. For internet access, deploy behind an HTTPS reverse proxy, use `DJ_SECURE_COOKIES=1`, restrict host login at the proxy, and set upstream request/body/time limits. Do not expose the development HTTP server directly to the internet. Sharing a join link does not carry credentials or the join code.

Put authorised `.mp3`, `.wav`, `.ogg` or `.m4a` files directly in the music folder. Filename convention: `Artist - Song title - Mood.mp3`. Moods become filters and staff background-mix options. Symlinks and paths outside this directory are not served. Customers receive metadata only; audio routes require a valid staff session. Files are loaded into host browser memory, so keep files reasonably sized. Browser codec support varies.

The host opens this app in **one playback tab**, connects its audio output to the pub speakers and presses Start / next song. A browser may require pressing the audio play control once. Leave the tab open and the device awake; automatic playback cannot survive a suspended browser. Use Open screen view for a silent projector window. The pilot has no playback leader election: a second staff playback tab can produce duplicate audio. Do not use a second playback tab. Screen view deliberately disables audio.

Requests need approval; the next approved request with most votes plays first, with oldest request winning ties. When none are approved the selected background mix supplies the next track. There is no generative AI DJ, crossfade, beat matching or speech synthesis. Staff can review every track; no automatic explicit-content classifier is included.

## Sales integration

`for-venues.html` links to the new product page. Prices shown are proposals, **not** live Stripe products: £19.99/month standalone software; £9.99/month for existing Local subscribers; £7.99/event. Costs and margins must be reviewed after music supply is priced. No existing billing or owner subscription was changed. No money is collected. The pilot does not yet enforce paid entitlements or integrate Local accounts, and runs as one venue per server instance. Owner complimentary entitlements belong in that future authenticated billing integration, not a public client-side bypass.

Before commercial launch: agree a permitted on-demand jukebox catalogue/provider integration and appropriate supplier rights, confirm each venue’s music permissions, implement authenticated venue tenancy and Stripe webhook entitlements including owner complimentary access, add staff logout and session administration, deployment monitoring, backups, multi-host playback control, fuller abuse controls and a verified mobile/browser acceptance run. The ordinary consumer Spotify service is unsuitable for pub playback.

The anonymous pilot uses 12-hour HttpOnly SameSite sessions, checks mutation origins and JSON content type, validates staff actions, rate-limits login/code attempts to 20 per IP per minute and requests to three per guest session per ten minutes. Votes are unique per guest session. Anonymous guests can obtain new sessions: this is not robust identity-based fraud prevention. The join code grants participation to anyone who knows it; it does not prove physical presence. Queue state persists across restarts; the host restarts the intended track if needed. Renewing sessions requires joining/logging in again.

## Verification

```sh
python3 -m unittest discover -s pub-dj/tests -v
node --check pub-dj/app.js
```

Integration tests cover access boundaries, origin rejection, duplicate requests, pending-request visibility, moderation, unique voting, queue advancement, audio access, request pausing, invalid inputs, rate limits, tie order and background mood selection. Browser/device and live speaker tests remain necessary.

## Rights references

- https://support.spotify.com/uk/article/spotify-public-commercial-use/
- https://www.ppluk.com/licensing/music-services-and-dubbing/
- https://pplprs.co.uk/jukeboxes/

Original sample audio was generated specifically for this prototype. No third-party recordings are bundled. Commercial playback requires rights appropriate to the use; venue and supplier permissions are separate questions.

## DJ deck controls

The now-playing panel places song details on the left and a compact two-platter console on the right on desktop. At widths of 720px and below the console stacks directly under the song. Staff controls include play/pause, restart, next, stop, forward 15 seconds, seeking, mute and master volume. The first platter follows actual host audio playback; the second is an up-next display, not a second audio player or crossfader. The centre mixer markings are decorative. Guests and projector views cannot operate the deck. Playback position, pause and volume are local to the single host device; guest views do not claim synchronised audio timing. The original control-room volume slider stays in sync with the deck. No Stripe, entitlement or deployment settings were changed for this UI update.

Deck-controller tests use a media stub to verify pause/resume without advancing the queue, start/next callbacks, guest and projector restrictions, seeking boundaries, mute restoration, unknown duration formatting and browser play errors. Together with discovery and HTTP integration tests, 19 tests pass. Visual/mobile acceptance remains outstanding because Chromium startup is blocked in the current environment.
