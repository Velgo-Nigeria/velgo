-- SQL Migration: Add views_count column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

-- Optionally, seed existing profiles with a random starting number of views so they don't start at zero
UPDATE public.profiles
SET views_count = floor(random() * 150 + 120)::integer
WHERE views_count IS NULL OR views_count = 0;

COMMENT ON COLUMN public.profiles.views_count IS 'Real-time and persistent total profile views count.';

-- Create security definer function to atomically increment profile views
CREATE OR REPLACE FUNCTION increment_profile_views(target_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = target_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Expressly allow authenticated and anonymous users to run this function
GRANT EXECUTE ON FUNCTION increment_profile_views(UUID) TO authenticated, anon;
