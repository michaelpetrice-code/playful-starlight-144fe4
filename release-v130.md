# The Local v130 — Slideshow display correction

- Removed previous/next/pause buttons and the Explore button below the slideshow. Automatic transitions remain active.
- Reframed the nine original promotional images into complete 1200 x 520 canvases with a separate bottom border/footer, because some supplied 1200 x 450 files themselves cut off their bottom edges. Original source pixels are preserved; missing source pixels cannot be restored by CSS.
- Overrides old fixed-height/cropped slideshow CSS without altering the rest of the app.
- Deploy to Netlify staging, hard-refresh and test on desktop and mobile.
- No Supabase changes.
