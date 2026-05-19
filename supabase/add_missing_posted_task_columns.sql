ALTER TABLE public.posted_tasks
ADD COLUMN IF NOT EXISTS subcategory TEXT,
ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS latitude NUMERIC,
ADD COLUMN IF NOT EXISTS longitude NUMERIC;

-- Create task-images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-images', 'task-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public Access Task Images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Task Images" ON storage.objects;

CREATE POLICY "Public Access Task Images"
ON storage.objects FOR SELECT
USING ( bucket_id = 'task-images' );

CREATE POLICY "Authenticated Upload Task Images"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'task-images' AND auth.role() = 'authenticated' );
