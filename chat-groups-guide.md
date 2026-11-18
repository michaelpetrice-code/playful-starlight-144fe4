THE LOCAL — CHAT GROUPS UPDATE (v16)

Chat now has a General Chat plus member-created chat groups within each existing community group.
Open Chat > Create chat group, give it a name, and select the new room. Members of the same community can enter it. Messages and photos are associated with their selected room.

Important: Chat rooms are visible to all members of the parent community; they are NOT private invitation-only chats. The existing Supabase posts table and its group access policies are reused, so no additional SQL is required.

To install: upload the entire lads-local-pwa folder to Netlify Deploys. Existing messages without a room ID remain in General Chat. New chat rooms and messages sync across devices when Supabase is configured. Test with two accounts before inviting members.
