-- Preserve existing private bucket access, size limit and other accepted media.
update storage.buckets
set allowed_mime_types = array_append(allowed_mime_types, 'image/gif')
where id = 'tl-table-media'
  and allowed_mime_types is not null
  and not ('image/gif' = any(allowed_mime_types));
