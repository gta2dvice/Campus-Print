-- Campus Print — Storage bucket + policies
-- Run after creating a private bucket named `uploaded-pdfs` in the Dashboard
-- (Storage → New bucket → name: uploaded-pdfs → Public: OFF).

-- Policies: no public/anon access. The Express backend uses the service role key,
-- which bypasses RLS. Users download files only through authenticated admin API routes.

DROP POLICY IF EXISTS "No public read uploaded-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "No public write uploaded-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "No public update uploaded-pdfs" ON storage.objects;
DROP POLICY IF EXISTS "No public delete uploaded-pdfs" ON storage.objects;

-- Deny all operations for anon/authenticated roles on this bucket.
-- (Service role is not subject to these policies.)

CREATE POLICY "No public read uploaded-pdfs"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id <> 'uploaded-pdfs');

CREATE POLICY "No public write uploaded-pdfs"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (false);

CREATE POLICY "No public update uploaded-pdfs"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No public delete uploaded-pdfs"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (false);
