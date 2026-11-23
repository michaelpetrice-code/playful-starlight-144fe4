# Complimentary DJ access

Permanent full-access grants have been recorded in the live Local database for Michael's verified platform-owner account and Coombe Social Club's Coventry venue record. Both have no expiry and require no payment. No Stripe subscription or payment method was created.

The authoritative grant table is `public.local_dj_complimentary_access`. It is protected by RLS and has no anonymous or authenticated table privileges; only trusted server code can read or modify it. Michael's trusted Auth app metadata also includes `local_dj_access` for the personal grant. Never trust client-side email checks, user_metadata or localStorage as proof of entitlement.

Release integration remains outstanding: the deployed DJ server must verify the user's identity and venue-management permission, then check a matching unexpired grant before offering checkout. A venue grant waives the DJ software fee for authorised venue staff; it does not make every visitor a host or grant music rights. The current pilot host-password flow does not yet consume these grants. Do not claim complimentary sign-in is usable until that integration and deployment have been verified.
