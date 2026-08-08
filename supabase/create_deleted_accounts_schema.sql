-- Create deleted_accounts table for security audit & preventing re-registration
CREATE TABLE IF NOT EXISTS public.deleted_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone_number TEXT,
  role TEXT,
  reason TEXT DEFAULT 'User self-requested account deletion',
  metadata JSONB DEFAULT '{}'::jsonb,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index email and phone_number for rapid lookup during Sign Up / Login
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_email ON public.deleted_accounts (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_deleted_accounts_phone ON public.deleted_accounts (phone_number);

-- RLS Policies
ALTER TABLE public.deleted_accounts ENABLE ROW LEVEL SECURITY;

-- Allow public read for sign-up / login deletion checks
DROP POLICY IF EXISTS "Allow public read for deletion check" ON public.deleted_accounts;
CREATE POLICY "Allow public read for deletion check" ON public.deleted_accounts
  FOR SELECT USING (true);

-- Allow insertion for deletion records
DROP POLICY IF EXISTS "Allow user to insert deletion record" ON public.deleted_accounts;
CREATE POLICY "Allow user to insert deletion record" ON public.deleted_accounts
  FOR INSERT WITH CHECK (true);

-- Allow deletion/restoration by admins
DROP POLICY IF EXISTS "Allow admin full access on deleted_accounts" ON public.deleted_accounts;
CREATE POLICY "Allow admin full access on deleted_accounts" ON public.deleted_accounts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.email IN ('velgonigeria.uni@gmail.com'))
    )
  );

-- Update delete_own_account() function to automatically record into deleted_accounts before deleting auth.users
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  current_user_id UUID;
  user_prof RECORD;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated.';
  END IF;

  -- Fetch profile snapshot before deletion
  SELECT * INTO user_prof FROM public.profiles WHERE id = current_user_id;

  -- Record into deleted_accounts if profile existed
  IF user_prof.id IS NOT NULL THEN
    INSERT INTO public.deleted_accounts (user_id, full_name, email, phone_number, role, reason, metadata, deleted_at)
    VALUES (
      user_prof.id,
      user_prof.full_name,
      LOWER(COALESCE(user_prof.email, '')),
      user_prof.phone_number,
      user_prof.role,
      'User self-requested account deletion via Settings',
      to_jsonb(user_prof),
      NOW()
    );
  END IF;

  -- Attempt to delete storage objects owned by the user
  BEGIN
    DELETE FROM storage.objects WHERE owner = current_user_id;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Delete the user from auth.users (triggers cascade deletes across profiles, bookings, etc.)
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION delete_own_account TO authenticated;
