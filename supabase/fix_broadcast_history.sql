-- 1. Reset Policies: Remove any old or broken policies to start fresh
DROP POLICY IF EXISTS "Users can view relevant broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Admins can create broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Admins can delete broadcasts" ON public.broadcasts;
DROP POLICY IF EXISTS "Admins have full access" ON public.broadcasts;
DROP POLICY IF EXISTS "Users view targeted" ON public.broadcasts;

-- 2. Grant Permissions: Ensure the app can access the table
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;

-- 3. ADMIN POLICY (The Fix):
-- We use 'role::text' to fix the "operator does not exist" error.
-- This gives Admins full power to SELECT (history), INSERT (send), and DELETE (cleanup).
CREATE POLICY "Admins have full access" ON public.broadcasts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role::text = 'admin'
        )
    );

-- 4. USER POLICY:
-- Regular users can only VIEW messages sent to 'all' or their specific role.
CREATE POLICY "Users view targeted" ON public.broadcasts
    FOR SELECT USING (
        target_role = 'all' OR 
        target_role = (SELECT role::text FROM public.profiles WHERE id = auth.uid())
    );