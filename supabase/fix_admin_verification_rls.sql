-- ====================================================================
-- VELGO DATABASE MIGRATION: FIX ADMIN PROFILE UPDATES & VERIFICATION (RLS FIX)
-- ====================================================================

-- This script solves the issue where Admin approvals/tier changes are accepted in the UI 
-- but silently ignored by Supabase because row-level security (RLS) blocks updates
-- on other users' profiles.
-- We use a SECURITY DEFINER function to bypass RLS recursion limits on the profiles table.

-- 1. Create a helper function under SECURITY DEFINER to check admin status safely
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant execution rights to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO service_role;

-- 3. Create RLS Update Policy for Admins
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
FOR UPDATE TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- 4. Double check general select/update policies to ensure everyone can view profiles & edit own profiles
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "Users can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 5. Auto-Promote your main Admin email to role='admin' to ensure you have permissions
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE email = 'admin.velgo@gmail.com' 
   OR email = 'velgonigeria.uni@gmail.com';
