
-- 1. Ensure the 'ID-CARDS' bucket is set to public
UPDATE storage.buckets
SET public = true
WHERE id = 'ID-CARDS';

-- 2. Drop any conflicting policies on this specific bucket
DROP POLICY IF EXISTS "Public Access ID-CARDS" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload ID-CARDS" ON storage.objects;
DROP POLICY IF EXISTS "Users Manage Own ID-CARDS" ON storage.objects;

-- 3. Allow ANYONE to view images (Required for Admin Dashboard to see them)
CREATE POLICY "Public Access ID-CARDS"
ON storage.objects FOR SELECT
USING ( bucket_id = 'ID-CARDS' );

-- 4. Allow any logged-in user to UPLOAD their ID
CREATE POLICY "Authenticated Upload ID-CARDS"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'ID-CARDS' AND auth.role() = 'authenticated' );

-- 5. Allow users to update/delete their own files (Optional cleanup)
CREATE POLICY "Users Manage Own ID-CARDS"
ON storage.objects FOR ALL
USING ( bucket_id = 'ID-CARDS' AND auth.uid() = owner );
