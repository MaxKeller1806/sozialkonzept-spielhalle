-- Supabase Storage bucket for branding logos and other Certiano assets.
-- Uploads happen server-side via service role; public read for img/src URLs.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certiano-assets',
  'certiano-assets',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Public read certiano assets" ON storage.objects;

CREATE POLICY "Public read certiano assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'certiano-assets');
