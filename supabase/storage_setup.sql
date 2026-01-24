
-- 1. Create the 'branding' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Remove existing policies to avoid conflicts during setup
DROP POLICY IF EXISTS "Public Access Branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Branding" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete Branding" ON storage.objects;

-- 3. Policy: Allow anyone (public) to VIEW files in 'branding'
CREATE POLICY "Public Access Branding"
ON storage.objects FOR SELECT
USING ( bucket_id = 'branding' );

-- 4. Policy: Allow any logged-in user to UPLOAD to 'branding'
CREATE POLICY "Authenticated Upload Branding"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'branding' AND auth.role() = 'authenticated' );

-- 5. Policy: Allow Admins to DELETE/UPDATE files in 'branding' (Optional, for cleanup)
-- Assumes you have an 'admin' role check or specific user ID
CREATE POLICY "Admin Manage Branding"
ON storage.objects FOR ALL
USING ( bucket_id = 'branding' AND auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin') );
