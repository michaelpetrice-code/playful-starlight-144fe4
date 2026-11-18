# The Local v91 — Modern Pub Design & Easy Read

This release retains v90 application logic and adds a site-wide visual/accessibility refresh.

## What's new
- Warm cream, forest green and muted gold colour system, inspired by a welcoming modern British pub.
- Cleaner, more consistent spacing, borders, cards, navigation and forms.
- Larger default body text, generous line spacing, responsive heading sizes, improved input contrast and larger tap targets.
- Fixed-position **Easy Read** controls: cycle between normal, large and extra-large text; switch high-contrast mode on/off. Preferences saved on the current device.
- Image presentation improvements: responsive sizing, contain-fit for posters and cover art so text/images aren't cropped; responsive logos/icons.
- Clearer keyboard focus and reduced-motion support.

## Limitations and deployment checks
- This is a CSS-led redesign across existing screens, **not** a manual visual audit of every dynamically generated view. Legacy styles and inline overrides may still require targeted work.
- Original uploaded images are not upscaled or sharpened; low-resolution sources cannot be made crisp by CSS.
- Existing functions and Supabase integration are preserved. No backend changes.
- Test login, home, marketplace, events, messages, games, admin, mobile navigation, dark-mode switch and high-contrast on desktop and phones.
- For full accessibility, perform screen-reader and keyboard audits and contrast measurements on every route, including user-uploaded content.
