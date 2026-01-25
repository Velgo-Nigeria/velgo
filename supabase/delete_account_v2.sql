-- IMPROVED ACCOUNT DELETION FUNCTION
-- Run this in your Supabase SQL Editor

-- 1. Drop the old function if it exists to ensure clean slate
DROP FUNCTION IF EXISTS delete_own_account();

-- 2. Create the robust function
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get the current authenticated user ID
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated.';
  END IF;

  -- Attempt to delete storage objects owned by the user first
  -- This fixes common "foreign key constraint" errors if storage doesn't cascade
  BEGIN
    DELETE FROM storage.objects WHERE owner = current_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- If storage deletion fails (e.g. no permissions), we proceed. 
    -- If there's a hard constraint, the next step will fail anyway.
    NULL;
  END;

  -- Delete the user from auth.users
  -- This should CASCADE to public.profiles, bookings, messages, etc.
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

-- 3. Grant permission
GRANT EXECUTE ON FUNCTION delete_own_account TO authenticated;