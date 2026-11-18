# The Local v154 · Venue signup

Open `for-venues.html#plans`, choose Monthly or Annual, and select **Continue with my plan**. New venue owners enter their name, email and password once. The confirmation email returns them to the chosen plan. Existing members can sign in from the same screen. **Start my free trial** opens Stripe Checkout.

## Staging setup

- Deploy the v154 website to Netlify staging. Check that its configuration points to the staging Supabase project.
- In Supabase **Authentication → URL Configuration**, add the two exact redirect URLs below, replacing the example origin with your staging site's actual origin. Add the production equivalents during production deployment. If you use a custom confirmation email template, check that its confirmation link honours the supplied redirect URL.

  - `https://YOUR-STAGING-SITE/index.html?section=billing&plan=monthly&confirmed=1`
  - `https://YOUR-STAGING-SITE/index.html?section=billing&plan=annual&confirmed=1`

- Use `START-HERE-V152.md` to connect Stripe in test mode. Deploy the Edge Functions from v154. The v154 checkout function also returns the selected plan after someone exits Stripe before subscribing.
- With a fresh email address, choose Annual, submit the account form, open the confirmation link and check that the Annual plan is shown. Repeat for Monthly. Check resend, sign-in for an existing account, and the separate member sign-up.
- In Stripe test mode verify £0 due immediately, the selected renewal price, trial activation after the verified webhook and cancellation before the first charge.

Simulated checks passed for signup, confirmation return, resend, plan preservation and the checkout request. Real email delivery and Stripe checkout need staging verification.
