# The Local v24 — Share & Invite

Share button in the header on every screen, and Invite friends on Home and Account.

- General share: opens phone share sheet (WhatsApp, Messenger, SMS, email) or copies a message and website link on desktop. This does not automatically add someone to a community.
- Community share: Account > Share invite link (after selecting a community). Uses a `#join-community=` link.
- Private chat share: Private Chats > select a chat you created > Share private chat. Uses a `#join-private=` link. Only creators can retrieve these invitation links.
- Recipients must sign in or register; invitations do not bypass Supabase membership security.
- No SQL migration needed. Deploy the extracted `lads-local-pwa` folder to Netlify.
- The app's share functionality should be verified on your deployed site and on phones.
