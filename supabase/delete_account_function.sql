-- 1. Create a function to allow users to self-delete
-- This deletes the user from auth.users, which triggers CASCADE deletion
-- of their profile, bookings, messages, etc.
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS VOID AS $$
BEGIN
  -- Check if the user is calling this for themselves
  DELETE FROM auth.users
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Grant permission to authenticated users to call this function
GRANT EXECUTE ON FUNCTION delete_own_account TO authenticated;