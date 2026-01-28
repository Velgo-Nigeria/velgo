
-- Create the 'verifications' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('verifications', 'verifications', true)
ON CONFLICT (id) DO NOTHING;

-- Remove old policies to prevent conflicts
DROP POLICY IF EXISTS "Public Access Verifications" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Verifications" ON storage.objects;

-- Allow anyone to VIEW files (Necessary for the Admin Dashboard to display them)
-- Note: In a strict enterprise app, we would use signed URLs, but for this MVP, public read is standard.
CREATE POLICY "Public Access Verifications"
ON storage.objects FOR SELECT
USING ( bucket_id = 'verifications' );

-- Allow logged-in users to UPLOAD their ID
CREATE POLICY "Authenticated Upload Verifications"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'verifications' AND auth.role() = 'authenticated' );
