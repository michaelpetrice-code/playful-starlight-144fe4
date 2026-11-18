# The Local v183 — Owner-approved event card suggestions

Based on v182. In the Venue App Builder, the new **Create a complete event card with the assistant** panel offers beginner-friendly event templates, optional date/time/location/price fields and five context-matched bundled image/icon choices. Selecting **Suggest my event card** shows a proposal without changing the app. Selecting **Approve and add to my preview** inserts an editable Events card and updates the live preview. The owner must still Save draft or Publish.

No dates, prices, payment details or checkout links are fabricated. This is a deterministic guided assistant, not a generative AI model. It needs no new Supabase SQL beyond previously installed migrations.

Deploy the entire ZIP to the existing Netlify site. Test generating, choosing an image, approving, editing and saving/reloading a card. Live deployment and database integration were not tested.
