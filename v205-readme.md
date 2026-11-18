# The Local v205 — App Builder team administration

## Installation
1. Back up Supabase. In SQL Editor run `INSTALL-V205-TEAM-ADMINS.sql` as the database owner.
2. Deploy the contents of this ZIP to a Netlify **staging** site first, then sign in as an existing app owner.
3. Save an app first if the owner has not yet created one. Open App Builder and add an **existing authenticated user UUID** under App administrators.
4. Test the added account can retrieve, edit and unpublish the same app. Test a sixth admin is rejected, non-owners cannot add/remove, and outsiders cannot access the app.
5. Verify image uploads by delegated administrators; the existing media bucket may only allow uploads under the original owner's UUID. This release does not change storage policies.
6. Deploy to production only after tests pass.

## Scope / limitations
- This is an **App Builder owner team** model, not a complete migration of the separate `platform_venue_staff` Venue Control Centre or Coombe standalone admin panel. Those systems have not been verified in this Supabase project.
- The owner is counted even before a team row exists. Team row is created when first admin is added.
- Users must already have accounts. The owner adds by authenticated user UUID; email invitations are not implemented.
- A user can belong to only one builder team, and existing app owners cannot join another team.
- Owner's existing subscription entitlement is shared by their team; expiry revokes team builder access.
- No complimentary Coombe entitlement is assigned automatically: the correct owner UUID must be confirmed before adding it manually.
- Existing app data is not modified by this migration.
- The original function validation, slug checks, feature limits, revision conflict detection and publish rules are retained.

## Rollback
A rollback file is included. Removing team functions and restoring original functions revokes delegated access; it does not delete apps. Test rollback in staging first.
