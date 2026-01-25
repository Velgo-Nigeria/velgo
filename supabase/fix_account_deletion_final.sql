-- 1. Fix Bookings Table (The specific error you saw)
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_client_id_fkey,
DROP CONSTRAINT IF EXISTS bookings_worker_id_fkey;

ALTER TABLE bookings
ADD CONSTRAINT bookings_client_id_fkey
FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT bookings_worker_id_fkey
FOREIGN KEY (worker_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 2. Fix Messages Table
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_sender_id_fkey,
DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_sender_id_fkey
FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT messages_receiver_id_fkey
FOREIGN KEY (receiver_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. Fix Posted Tasks Table
ALTER TABLE posted_tasks
DROP CONSTRAINT IF EXISTS posted_tasks_client_id_fkey,
DROP CONSTRAINT IF EXISTS posted_tasks_assigned_worker_id_fkey;

ALTER TABLE posted_tasks
ADD CONSTRAINT posted_tasks_client_id_fkey
FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- If a worker is deleted, we keep the job but set 'assigned_worker_id' to NULL so the job becomes open again
ALTER TABLE posted_tasks
ADD CONSTRAINT posted_tasks_assigned_worker_id_fkey
FOREIGN KEY (assigned_worker_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- 4. Fix Support Messages
ALTER TABLE support_messages
DROP CONSTRAINT IF EXISTS support_messages_user_id_fkey;

ALTER TABLE support_messages
ADD CONSTRAINT support_messages_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 5. Fix Safety Reports
ALTER TABLE safety_reports
DROP CONSTRAINT IF EXISTS safety_reports_reporter_id_fkey;

ALTER TABLE safety_reports
ADD CONSTRAINT safety_reports_reporter_id_fkey
FOREIGN KEY (reporter_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 6. Fix Push Subscriptions
ALTER TABLE push_subscriptions
DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;

ALTER TABLE push_subscriptions
ADD CONSTRAINT push_subscriptions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- 7. RE-CREATE THE DELETION FUNCTION (To be 100% sure)
CREATE OR REPLACE FUNCTION delete_own_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, storage
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User is not authenticated.';
  END IF;

  -- Attempt to delete storage objects owned by the user (Avatar, Task Images)
  BEGIN
    DELETE FROM storage.objects WHERE owner = current_user_id;
  EXCEPTION WHEN OTHERS THEN
    -- If this fails (e.g. permission issue), we continue to delete the account
    NULL;
  END;

  -- Delete the user from auth.users (This triggers the CASCADE deletes above)
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;

-- 8. Grant Execute Permission
GRANT EXECUTE ON FUNCTION delete_own_account TO authenticated;