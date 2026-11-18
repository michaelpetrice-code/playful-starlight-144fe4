# The Local v160 — Invite Friends to a Virtual Pub Table

Deploy the contents of this ZIP to the existing Netlify site. This build preserves the original Supabase connection and login from v159.

When a member opens a table, **Invite Friends · Pull Up a Chair** opens the phone share sheet (WhatsApp, Messenger, email, etc.) or fallback WhatsApp/Facebook/Email/Copy links. Owners/moderators generate a one-use invitation token valid for seven days. Other members share a link to the table, but this does not bypass membership approval. Invitees must sign in; a one-use token is only redeemed after explicitly accepting it.

IMPORTANT: The Virtual Pub Tables SQL setup must still be installed in the original Supabase project for table creation and invites to function. The app does not send messages itself. Test in the live deployment before distributing invites.
