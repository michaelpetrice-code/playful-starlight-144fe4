# The Local v152 · 14-day venue subscription trial

Both venue plans start with a 14-day trial. Stripe collects a payment method when checkout starts. Access starts after Stripe confirms an eligible trial. The selected price is charged after the trial unless the customer cancels first. The current prices are £29.99 monthly and £299 annually.

## Set up in staging

1. Point the staging website at a separate staging Supabase project. Keep the test-mode subscription data in that project. Apply `INSTALL-V147-VENUE-APP-BUILDER.sql` if it is missing and then apply `INSTALL-V149-BILLING.sql`. Use the checkout and webhook functions in this v152 package.
2. In the staging project's Edge Function secrets, set:
   - `VENUE_APP_URL` to the HTTPS staging website root with a trailing slash.
   - `STRIPE_BILLING_MODE` to `test`.
   - `STRIPE_MONTHLY_PRICE_ID` to `price_1UaMM6RlvtejByKsGB3jxZ8m`.
   - `STRIPE_ANNUAL_PRICE_ID` to `price_1UaMM9RlvtejByKso90X11qL`.
   - `STRIPE_RESTRICTED_KEY` to a restricted test key for The Local with access to read prices and subscriptions, create customers and Checkout Sessions and create Customer Portal sessions. Enter it directly in Supabase's server-side secrets.
3. Deploy `venue-billing` and `venue-stripe-webhook` from this package. The former validates a Supabase user token inside the function and requires a confirmed email. If using modern Supabase signing keys that the gateway cannot verify, use that application-level validation with gateway JWT verification disabled for this function. Stripe's webhook has no Supabase user token, so set gateway JWT verification off for `venue-stripe-webhook` and use its Stripe signature verification.
4. In Stripe test Workbench, add a destination for the staging project at `https://STAGING_PROJECT_REF.supabase.co/functions/v1/venue-stripe-webhook` using these events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, and `invoice.payment_failed`. Save this destination's signing secret as `STRIPE_WEBHOOK_SECRET` in the staging project. The existing Mocha destination is separate.
5. Enable cancellation in the Stripe Customer Portal and enable Stripe trial-ending emails. Confirm **Manage billing** opens that portal and cancellation effective on or before the trial end stops the charge.
6. Deploy the website to Netlify staging. Use a confirmed test member to start a trial on each plan. Verify Stripe shows zero due at signup, the selected renewal price and date, and the builder becomes available only after the signed webhook. Use separate test customers to verify cancellation before the end, first successful billing after the trial, and failed first payment. Verify actual webhook delivery and confirm the builder stops accepting access when the trial or paid period ends. Check the trial-ending email configuration in Stripe.
7. Recheck the live merchant’s Stripe Tax settings and VAT registration status before enabling automatic tax or real payments. The test release leaves automatic tax off.

## Verification in this build

Local checks exercised both Checkout payloads and mocked signed events for trial start, cancellation, no payment method, conversion to paid access, failed payment and rejection of invalid signatures. Real Stripe checkout, Supabase deployment, portal cancellation and trial-ending emails require staging verification.
