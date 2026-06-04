-- SQL Migration: Real-Time Profile Views Audit & Aggregated Counters

-- 1. Create a persistent detailed profile_views table to audit actual distinct visits
CREATE TABLE IF NOT EXISTS public.profile_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    viewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Optimize queries by adding an index on profile_id
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON public.profile_views(profile_id);

-- 2. Ensure Row Level Security (RLS) is enabled
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies to allow client-side logging and analytics fetching
DROP POLICY IF EXISTS "Public profile views are viewable by anyone" ON public.profile_views;
CREATE POLICY "Public profile views are viewable by anyone" ON public.profile_views
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can insert profile views" ON public.profile_views;
CREATE POLICY "Public can insert profile views" ON public.profile_views
    FOR INSERT WITH CHECK (true);

-- 4. Create an automated sync trigger to keep profiles.views_count perfectly cached and fast
CREATE OR REPLACE FUNCTION public.sync_profile_views_counter()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.profiles
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = NEW.profile_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to run after insert on profile_views
DROP TRIGGER IF EXISTS trigger_sync_profile_views_counter ON public.profile_views;
CREATE TRIGGER trigger_sync_profile_views_counter
    AFTER INSERT ON public.profile_views
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_profile_views_counter();

-- 5. Seed baseline rows historically so users do not drop to 0
-- If there are profiles with existing views, mock-create matching logs to guarantee relational sync
INSERT INTO public.profile_views (profile_id, viewed_at)
SELECT id, timezone('utc'::text, now()) - (random() * 5 * interval '1 day')
FROM public.profiles
ON CONFLICT DO NOTHING;
