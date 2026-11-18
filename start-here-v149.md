# The Local v149

Start with a Netlify staging deploy and a separate staging Supabase project. Point `config.js` at that project using its URL and publishable key before uploading the ZIP. This is the full v148-based site package, including Virtual Pub Tables and Venue App Builder.

## Administration

Apply `INSTALL-V149-ADMINISTRATION.sql` to the database where your existing admin, venue application and safety tables live. Sign in as an authorised user. The bottom-left cog opens **Administration**. A regular member sees no cog. Platform controls, venue staff controls, club content and emails, application decisions, marketplace and trades moderation, and safety reports each use their existing permissions. The old Venue Control Centre URL opens the same page.

Verify the platform owner, a venue manager and a regular member separately. Check that their scopes are correct and that staff can switch between their own venues only. Existing connected venue apps need to read the platform feature flags before the toggles can hide features.

## Subscription and subscriber activation

The site offers one venue app subscription at **£29.99 monthly** or **£299 annually**. Checkout uses the selected Stripe price, which the backend checks against the advertised amount and period. No live charges were made or enabled while building this release.

1. In staging, apply `INSTALL-V147-VENUE-APP-BUILDER.sql` if needed, then apply `INSTALL-V149-BILLING.sql`. Keep staging and production databases separate.
2. Set these Edge Function secrets in the same Supabase project:
   - `VENUE_APP_URL` with the HTTPS site root and trailing slash.
   - `STRIPE_RESTRICTED_KEY` with Stripe access to read prices and subscriptions, write customers and Checkout Sessions, and create customer portal sessions. Use a Stripe sandbox key for staging. Set `STRIPE_BILLING_MODE` to `test` on staging. It must be explicitly set to `live` with a matching restricted live key before taking real payments.
   - `STRIPE_MONTHLY_PRICE_ID` and `STRIPE_ANNUAL_PRICE_ID` with the recurring GBP price IDs from the same Stripe account and mode.
   - `STRIPE_WEBHOOK_SECRET` from Stripe Workbench for the deployed webhook endpoint.
3. Deploy `venue-billing` and `venue-stripe-webhook` from `supabase/functions`. Keep user token verification on for `venue-billing`. The webhook receives Stripe requests without a Supabase user token, so deploy that function with `--no-verify-jwt`. Its handler verifies Stripe’s signature before accepting an event. Current application access is taken from the Stripe subscription retrieved by the backend and the latest paid invoice.
4. Configure the Stripe customer portal and subscribe the webhook to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`.
5. In staging, use a verified test account. Start from For Venues, select a plan, sign in, then choose the plan in the billing page. Test both amounts, successful and declined payments, cancelling Checkout, managing a subscription, failed renewal and cancellation, and another user trying to access the builder without a subscription. Confirm the builder opens only after verified activation and a published sample venue is removed from public view when its entitlement ends. For a cancelled Checkout still open in Stripe, close it on Stripe or allow the session reservation to expire before starting another.
6. For the AI assistant, deploy `venue-builder-ai` and set the server-side `OPENAI_API_KEY`. See `START-HERE-V147.md`. The manual editor and template work without the AI key.

Before taking production payments, configure the actual merchant’s Stripe account, tax treatment, customer terms, privacy information, cancellation terms and support contact. Verify the live site and the payment methods you intend to offer on compatible customer devices. Venue event tickets still link out to the venue’s own ticket provider. The Rounds section records rounds, the Kitty records entries, and rewards and club draws are informational in generated apps.

Stripe setup references: [Subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks), [Checkout fulfilment](https://docs.stripe.com/checkout/fulfillment), [Customer portal](https://docs.stripe.com/customer-management).

## Verification for this package

The release passed local syntax, link, asset and archive checks. Simulated tests covered the combined admin menu and access checks, Virtual Pub Tables refresh behaviour, AI suggestions and publishing, and Stripe checkout, webhooks and subscription activation logic. Both packaged cue-game test suites passed. This package has not been signed off against real Netlify, Supabase and Stripe services or on a physical phone.
