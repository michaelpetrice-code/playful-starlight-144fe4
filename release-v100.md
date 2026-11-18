# The Local v100 — Missing game pictures, image audit and homepage font fix

## Fixed
- Games Room's **Pub Pinball** and **Five Dice (Yatzy)** previously pointed at missing `assets/games-v68/pinball.webp` and `yatzy.webp`. These now use distinct real photographs from Unsplash and Wikimedia Commons, respectively.
- If an external game photo is unavailable, the existing game-specific illustration appears instead of a broken image icon or blank tile.
- All nine home tile image sources are now distinct. Marketplace uses its existing distinct bundled tile art; Venue Hub uses the Coombe Social Club photo; Trades & Services keeps its own photo. Other tiles retain their individual photos.
- Home dark backgrounds, main welcome banner, tile labels and subtitles use consistent cream/gold text rather than black.
- All existing v99 features and Coombe Social Club venue profile are retained.

## Verification
- Static audit script `audit_images_v100.py` validates 39 bundled images, local literal resource references, the 14 Games Room image sources and uniqueness of the nine home tile sources.
- `IMAGE-AUDIT-v100.md` contains the audit results.
- All JavaScript files pass `node --check` and the ZIP archive is verified.

## Important limits
- The new Pinball and Yatzy photographs are **hosted externally** and require an internet connection; SVG fallbacks prevent blank tiles if loading fails.
- Other remote Pexels images used by the site cannot be guaranteed online from an offline audit.
- Dynamic uploaded images, venue photos from Supabase, and all live page states require real-browser testing on Netlify; no live browser test was performed.
- Some intentional repeated branding photos remain on different pages (for example login and hero). The nine home tiles themselves do not repeat the same image.

## Image credits
- Pinball photograph: Heather McKean, Unsplash, https://unsplash.com/photos/closeup-photo-of-pinball-machine-we-ah3XnnbM (Unsplash License).
- Five Dice photograph: PierreSelim, Wikimedia Commons, https://commons.wikimedia.org/wiki/File:Dice_-_1-2-4-5-6.jpg (CC BY 3.0, https://creativecommons.org/licenses/by/3.0/). The displayed image may be resized by Wikimedia.
