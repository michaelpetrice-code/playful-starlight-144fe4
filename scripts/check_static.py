#!/usr/bin/env python3
"""Read-only release smoke checks; no network, credentials, or database access."""
from pathlib import Path
from html.parser import HTMLParser
import re
import sys
from urllib.parse import urlsplit, unquote

ROOT = Path(__file__).resolve().parent.parent

class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []
        self.links = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        for name in ('src', 'href'):
            if name in a:
                self.refs.append((tag, name, a[name]))
        if tag == 'a' and a.get('class', '').find('guest-feature') >= 0:
            self.links.append(a.get('href', ''))

def check_page(filename):
    path = ROOT / filename
    assert path.is_file(), f'Missing essential page: {filename}'
    parser = PageParser()
    parser.feed(path.read_text(encoding='utf-8'))
    failures = []
    for tag, attribute, raw in parser.refs:
        parsed = urlsplit(raw)
        if parsed.scheme or parsed.netloc or raw.startswith(('#', '/', 'data:', 'mailto:', 'tel:')):
            continue
        relative = unquote(parsed.path)
        if not relative:
            continue
        destination = (path.parent / relative).resolve()
        if not destination.is_relative_to(ROOT.resolve()) or not destination.is_file():
            failures.append(f'{filename}: {attribute}={raw!r} missing or unsafe')
    return parser, failures

def main():
    failures = []
    pages = ('index.html', 'guest.html', 'games-room-next.html', 'for-venues.html', 'coombe-builder-preview.html')
    parsed = {}
    for filename in pages:
        p, f = check_page(filename)
        parsed[filename] = p
        failures += f
    guest_js = (ROOT / 'guest.js').read_text(encoding='utf-8')
    index = (ROOT / 'index.html').read_text(encoding='utf-8')
    if 'id="tl-continue-guest"' not in index or 'href="guest.html"' not in index:
        failures.append('index.html: visible guest route is missing')
    links = parsed['guest.html'].links
    if len(links) != 12:
        failures.append(f'guest.html: expected 12 gallery links; found {len(links)}')
    pages_in_gallery = []
    for link in links:
        if not link.startswith('guest.html?page='):
            failures.append(f'guest gallery points outside guest routes: {link}')
        else:
            pages_in_gallery.append(link.split('page=', 1)[1].split('&', 1)[0])
    if len(set(pages_in_gallery)) != len(pages_in_gallery):
        failures.append('guest.html: duplicate guest gallery destinations')
    for page in pages_in_gallery:
        if not re.search(r'\b' + re.escape(page) + r'\s*:', guest_js):
            failures.append(f'guest.js: no page configuration found for {page!r}')
    marketplace_js = (ROOT / 'marketplace.js').read_text(encoding='utf-8')
    sample_photos = re.findall(r"photo:'([a-z-]+)'", marketplace_js)
    if not sample_photos:
        failures.append('marketplace.js: no sample photos found')
    for photo in sample_photos:
        image = ROOT / 'assets' / 'marketplace-samples' / f'{photo}.webp'
        if not image.is_file():
            failures.append(f'marketplace.js: missing sample image {image.name}')
    game_html = (ROOT / 'games-room-next.html').read_text(encoding='utf-8')
    for marker in ('id="game-root"', 'id="games"', 'games-room-next.js', 'realistic-engines-v192.js'):
        if marker not in game_html:
            failures.append(f'games-room-next.html: missing game marker {marker}')
    if failures:
        print('FAILED static smoke checks:')
        for f in failures:
            print(' - ' + f)
        return 1
    print('PASS: homepage guest link; 12 guest routes; public page assets; marketplace sample images; Games Room shell')
    print('NOTE: This does not test authentication, live Supabase, game rules, graphics, or multiplayer.')
    return 0

if __name__ == '__main__':
    sys.exit(main())
