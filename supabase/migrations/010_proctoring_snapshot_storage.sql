-- Private storage for proctoring evidence snapshots.
-- Access must be granted through backend-generated signed URLs; snapshots are
-- never publicly readable.
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'proctoring-snapshots',
  'proctoring-snapshots',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = excluded.allowed_mime_types;
