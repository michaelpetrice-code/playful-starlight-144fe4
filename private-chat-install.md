# The Local v17 — Private Chat Groups

1. Extract this ZIP.
2. Open Supabase > SQL Editor and run `PRIVATE-CHAT-SETUP.sql`. This is required for secure access controls.
3. Upload the `lads-local-pwa` folder to Netlify Deploys.
4. Sign in, then choose More > Private Chats.
5. Create a private group and copy its invite code. Share the code directly with chosen members.
6. Other registered members open Private Chats and enter the code to join.

## Privacy notes
- Private chats use separate Supabase tables with row-level security. The existing open community chats are unchanged.
- Only joined members can query private messages. A code holder can join, so treat invitation codes as secrets.
- Messages are not end-to-end encrypted; the Supabase project owner can access stored content.
- This first release supports text-only private chat. Photos remain in the existing community chat.
- A group creator can share the code; any member can leave. No kick/remove/rotate-code UI yet.
- New messages appear when the chat is opened or refreshed; background push for private chats is not yet implemented.
- Test with two separate accounts before inviting the community.
