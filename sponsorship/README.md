# The Local — manual sponsorship operations

Rates: Community £25/month (Partners), Section £50/month (Football or Games + Partners), Main £100/month (guest home/member app + Partners), Featured £10/month (public Trades page + Partners). Cards may share placements; no impression/lead/exclusivity guarantee.

Enquiries prepare an email draft only. No new payment gateway, paid AI, subscriptions, ads or recurring charges are enabled. Agree terms and payment directly; owner confirmation is a manual record, not payment-processor verification.

Owner Dashboard → Income & sponsorship: save a draft; agree name/message/website/slot/dates/price; independently confirm payment; enter a private payment reference and check both confirmation boxes; approve. Pause is reversible. Public functions only return approved cards within their period; expiry works without cron. Open tabs check expiry every 15 seconds and refresh pause/edits within five minutes. Renewals require manual confirmation.

Apply install.sql after confirming the existing local_is_owner() owner-list guard. Raw tables have RLS and no anon/member grants. Only guarded owner RPC can manage records; the public RPC projects advertisement fields only, never private payment references or owner IDs. Changes add an audit row. No sponsor is seeded or activated by installation.

Verification: database-test.sql is transactional staging QA and rolls all fixture changes back, including a temporary owner-list row if needed. Covers non-owner rejection, payment confirmation, public-field privacy, correct slots, pause, future/expired periods, credential URL rejection and audit. Node tests cover URL and client expiry. Browser QA uses synthetic data for owner layout, save/pause/validation and assistant navigation; no real payment or sponsor agreement is created.

The no-cost owner guide uses topic-based checklists and aggregate dashboard counts. It makes no AI provider request; a brief can be copied into the owner's existing ChatGPT conversation for more detailed assistance. It does not auto-publish, moderate or change member access.

Theme applies to The Local's welcome, guest, venue marketing, partner, football, Games Room, secure-table and administration/competition entry pages. Subscriber venue pages and builder previews retain their chosen venue branding. Free registration, guest mode and existing authentication/billing logic are preserved.
