# The Local v182 — Assistant Media Suggestions

Based on v181. The Venue App Builder now recommends five bundled photos/icons for the venue logo and each individual feature card, based on the feature, title, description and venue type. Suggestions update on demand when text changes. The owner must explicitly select a suggestion; selections update the preview immediately and are not saved until Save draft or Publish. The existing full library and custom upload remain available.

Recommendations use local keyword matching, not a remote AI model; no new data leaves the browser and no SQL changes are needed. They are intended as a reliable beginner-friendly complement to the existing AI writing assistant, not generative AI.

Deploy the full ZIP to the main Netlify site after backing up. Test Events, Room Hire, Games and venue logo, then save and reload. No live deployment was performed.
