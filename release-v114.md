# The Local v114 — Cue Table Graphics Upgrade

This release builds directly on the v113 app. The playable 8-ball pool and snooker renderer in arcade-engines-v79.js now uses a new detailed canvas renderer (cue-render-v114.js).

Improvements: simulated walnut grain, beveled rail/cushion details, directional cloth lighting, pocket liners, realistic ball shading, pool stripes and ball numbers, aim guide and visible cue. A matching responsive cue table shell is in cue-premium-v114.css. Existing physics, referee logic, scoring, darts, classics and admin code are unchanged.

This is a high-detail 2D canvas graphics upgrade, NOT a 3D/WebGL engine or new physics model. Test pool/snooker on staging before production.

Deploy: extract ZIP and upload the contents of the site folder to Netlify staging. Hard refresh.
