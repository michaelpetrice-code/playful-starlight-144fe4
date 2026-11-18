# The Local v188 — Automatic Builder Progress Saving

- Automatically backs up edits on the current device as they are made, including feature cards and theme changes.
- Automatically saves valid drafts to Supabase after 2.5 seconds of inactivity using the existing authenticated `local_builder_save` RPC.
- Incomplete drafts are retained locally until required fields are complete.
- When newer unsaved local changes exist, owners are asked whether to restore them when reopening the Builder.
- Shows saving status. Publishing remains a separate explicit action; autosave never publishes.
- Manual Save draft remains available.

Limitations: Browser local storage may be cleared by private browsing or device cleanup; cross-device progress requires a successful cloud save. Owners should use Save draft before switching devices. No SQL migration required.
