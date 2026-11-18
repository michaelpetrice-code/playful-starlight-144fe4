# The Local v184 — Arcade Coaching and Practice Upgrade

Built on the full v183 site. Improvements:
- A dedicated improved practice room reachable via a new button in the existing Games Room.
- Contextual coaching tips for the games (rule-based, local; no remote AI service or generative AI claim).
- Connect Four computer difficulty: Beginner, Standard, Challenging, with depth-limited minimax and immediate win/block detection.
- Local Connect Four win/loss/draw history on this browser.
- Mobile-friendly coach controls and clearer status messages.
- Eleven games remain available in the practice room.

## Deploy
Upload the complete ZIP to the **main The Local Netlify site**. No SQL migration required. Hard refresh the page after deployment. Visit the main Games Room, then click **Improved Arcade · AI game coach & practice**.

## Limitations
This is an incremental quality upgrade, not a full rewrite of pool, snooker, darts or real-time multiplayer. Pool is still a physics practice table. Scores are device-local and not verified competitive results. Coaching is a rules-based assistant, not a connected language model. No live deployment or end-to-end browser test has been performed.
