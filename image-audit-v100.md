# The Local v100 — image audit

- Checked 39 bundled image files (image decode/validation).
- Checked 14 Games Room tile definitions; 12 local assets and 2 external real photographs with SVG fallbacks.
- Checked local literal image, CSS and HTML resource references across all site source files.
- Checked all nine effective home tile background sources for exact duplication.
- Reviewed Coombe venue gallery assets.

**Static audit: PASS.**

## Nine home tile sources
1. https://images.pexels.com/photos/5054658/pexels-photo-5054658.jpeg?auto=compress&cs=tinysrgb&w=900
2. https://images.pexels.com/photos/6816891/pexels-photo-6816891.jpeg?auto=compress&cs=tinysrgb&w=900
3. https://images.pexels.com/photos/7016022/pexels-photo-7016022.jpeg?auto=compress&cs=tinysrgb&w=900
4. https://images.pexels.com/photos/32376368/pexels-photo-32376368.jpeg?auto=compress&cs=tinysrgb&w=900
5. assets/pub-v97/marketplace.webp
6. https://images.pexels.com/photos/1872888/pexels-photo-1872888.jpeg?auto=compress&cs=tinysrgb&w=900
7. assets/coombe/venue-banner.jpg
8. https://images.pexels.com/photos/6816907/pexels-photo-6816907.jpeg?auto=compress&cs=tinysrgb&w=900
9. https://images.pexels.com/photos/5054661/pexels-photo-5054661.jpeg?auto=compress&cs=tinysrgb&w=900

## Caveats
- This checks bundled resources and known game/home references. Dynamic user-uploaded content, Supabase images and third-party image hosts cannot be guaranteed offline.
- Site-wide intentional reuse of a brand/hero photograph on login and internal banners is not treated as a duplicate tile.
- Live visual/browser checks are not possible in this environment; check a Netlify staging deployment.
- The two game photographs require internet connectivity; if unavailable, a nonblank SVG game illustration appears.

## Problems
- None in the static checks.
