-- ========================================================
-- VELGO DATABASE COMPREHENSIVE MIGRATION: BROADCASTS TABLE
-- ========================================================

-- This migration creates the public.broadcasts table and establishes 
-- strict security policies to prevent unauthenticated access or manipulation.

-- 1. Create Broadcasts Table
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role TEXT DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

-- 3. Reset Old/Broken Policies to start fresh
DROP POLICY IF EXISTS "Admins have full access" ON public.broadcasts;
DROP POLICY IF EXISTS "Users view targeted" ON public.broadcasts;
DROP POLICY IF EXISTS "Users can view relevant broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Admins can create broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Admins can delete broadcasts" ON public.broadcasts;

-- 4. Create Policies:
-- Admins have full access to select, insert, and delete broadcasts.
-- Users have access to select broadcasts targeted to 'all' or their specifically defined profile role.
CREATE POLICY "Admins have full access" ON public.broadcasts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role::text = 'admin'
        )
    );

CREATE POLICY "Users view targeted" ON public.broadcasts
    FOR SELECT USING (
        target_role = 'all' OR 
        target_role = (SELECT role::text FROM public.profiles WHERE id = auth.uid())
    );

-- 5. Grant access permissions to Supabase clients
GRANT ALL ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;

-- 6. Trigger for Admin Broadcast Emails (Optional Webhook mapping)
-- Note: This requires the supabase_functions extension and local webhook handler.
-- If you use email notifications, uncomment the snippet below after installing supabase_functions:
--
-- DROP TRIGGER IF EXISTS trigger_send_broadcast_email ON public.broadcasts;
-- CREATE TRIGGER trigger_send_broadcast_email
-- AFTER INSERT ON public.broadcasts
-- FOR EACH ROW
-- EXECUTE FUNCTION supabase_functions.http_request(
--   'https://velgo.com.ng/api/send-email',
--   'POST',
--   '{"Content-Type":"application/json"}',
--   '{}',
--   '2000'
-- );
