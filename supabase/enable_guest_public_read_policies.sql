-- =========================================================
-- VELGO NIGERIA: GUEST MODE PUBLIC READ POLICIES
-- Run this script in your Supabase SQL Editor to allow unauthenticated
-- guest users to view open task listings & verified worker profiles.
-- =========================================================

-- 1. Enable RLS on posted_tasks (if not already enabled)
ALTER TABLE public.posted_tasks ENABLE ROW LEVEL SECURITY;

-- 2. Allow anyone (authenticated or anonymous guest) to view OPEN posted tasks
DROP POLICY IF EXISTS "Anyone can view open tasks" ON public.posted_tasks;
CREATE POLICY "Anyone can view open tasks" 
ON public.posted_tasks 
FOR SELECT 
TO public 
USING (status = 'open');

-- 3. Enable RLS on profiles (if not already enabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Allow anyone (authenticated or anonymous guest) to view user profiles
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles" 
ON public.profiles 
FOR SELECT 
TO public 
USING (true);

-- 5. Grant SELECT permissions on public schema tables to anon role
GRANT SELECT ON public.posted_tasks TO anon;
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT ON public.app_reviews TO anon;

-- Confirmation
SELECT 'Guest mode public RLS policies applied successfully!' AS status;
