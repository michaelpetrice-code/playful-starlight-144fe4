# The Local v84 — Buy, Sell or Give Away

Upgraded the existing marketplace rather than replacing it.

* Create Sale, Free or Swap listings with up to **8 JPG/PNG/WebP photos** (5 MB per image).
* Preview photos before publishing, with the first photo as the cover.
* View a full-size image gallery with selectable thumbnails.
* Edit your own listing details and replace its photo set.
* Sort by newest, oldest, lowest or highest price.
* Browse improved responsive cards with photo counts, search and categories.
* Existing private enquiries, offers, replies, reporting and sold status remain.

## Setup
Use the existing `MARKETPLACE-SETUP.sql` if not already installed, then run `MARKETPLACE-v84-UPGRADE.sql` in Supabase SQL Editor. Configure the `marketplace-photos` storage bucket. No external payments, delivery or checkout are provided; buyers and sellers arrange these directly.

## Limitations
This is not an eBay-equivalent payment, shipping, bidding, buyer-protection or dispute system. Browser and multi-account testing is still required. When replacing photos on an existing listing, old image objects remain in storage; administrators may periodically remove unused files. All private information must be protected by Supabase RLS.
