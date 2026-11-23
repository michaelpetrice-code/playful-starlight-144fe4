# Pub Quiz Pro billing

Deploy this function after applying `install-pub-quiz.sql` to the intended database.
For quiz-only venues, a platform administrator must insert the verified owner and
approved directory venue IDs into `local_quiz_venue_owners`. Existing linked
Venue App Builder owners are resolved through their app.

Configure these secrets on the function environment:

- `QUIZ_APP_ORIGIN` is the exact HTTPS origin of the quiz deployment.
- `QUIZ_STRIPE_MODE` is `test` or `live`.
- `QUIZ_STRIPE_KEY` is the matching Stripe key with the scopes required for checkout creation and price/subscription reads.
- `QUIZ_STANDARD_PRICE` and `QUIZ_SUBSCRIBER_PRICE` are the recurring GBP price IDs in that mode.
- `QUIZ_STRIPE_WEBHOOK_SECRET` is the signing secret for this function's webhook URL.

Existing Supabase runtime secrets supply the API URL, anon key and service role
key. The function verifies user tokens for checkout and Stripe signatures for
webhooks. Configure the endpoint for subscription created, updated and deleted
events and invoice paid and payment failed events. Confirm successful renewal and
cancellation in Stripe before launch.

The connected Stripe test account contains product `prod_VgIpLiEZbzrm55`, standard
price `price_1UewECRlvtejByKsXqOTqrsG`, and subscriber price
`price_1UewEKRlvtejByKstFPADhWU`. Use a separate staging database for test checkout.
The current entitlement policy excludes test subscriptions from quiz access.
Create matching live prices and configure a live webhook before exposing live checkout.
