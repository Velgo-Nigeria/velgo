-- 1. Fix the missing column error during booking initiation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS task_count INTEGER DEFAULT 0;

-- 2. Backfill task_count for existing profiles just in case
UPDATE profiles SET task_count = COALESCE(task_count, 0);

-- 3. Fix the "Delete task not working" issue by ensuring the correct RLS policy exists
DROP POLICY IF EXISTS "Clients can delete their own tasks" ON posted_tasks;
CREATE POLICY "Clients can delete their own tasks" ON posted_tasks
FOR DELETE
USING (auth.uid() = client_id);

-- Optional: Ensure task_id in bookings cascades instead of just setting null,
-- but setting to null is fine. Let's make it cascade if we want the applications to disappear when the task is deleted.
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_task_id_fkey;

ALTER TABLE bookings
ADD CONSTRAINT bookings_task_id_fkey
FOREIGN KEY (task_id) REFERENCES posted_tasks(id) ON DELETE CASCADE;
