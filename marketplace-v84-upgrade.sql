-- Run after MARKETPLACE-SETUP.sql. The listings table already stores multiple photo paths.
-- Existing listing rows and messages are preserved.
drop policy if exists "market_photo_update" on storage.objects;
create policy "market_photo_update" on storage.objects for update to authenticated
 using(bucket_id='marketplace-photos' and (storage.foldername(name))[1]=auth.uid()::text)
 with check(bucket_id='marketplace-photos' and (storage.foldername(name))[1]=auth.uid()::text);
drop policy if exists "market_photo_delete" on storage.objects;
create policy "market_photo_delete" on storage.objects for delete to authenticated
 using(bucket_id='marketplace-photos' and (storage.foldername(name))[1]=auth.uid()::text);
-- The application enforces eight photos per listing.
