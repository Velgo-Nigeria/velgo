-- This file adds missing DELETE policies for tables that cascade delete.
-- When a user deletes a task or account, Postgres cascades the deletion. 
-- If the child tables have RLS enabled (which they do) but lack a DELETE policy, 
-- the cascading deletion is aborted with a permission error.

-- 1. Allow clients to delete bookings on their tasks.
DROP POLICY IF EXISTS "Bookings deletable by involved users" ON bookings;
CREATE POLICY "Bookings deletable by involved users" ON bookings 
FOR DELETE USING (auth.uid() = client_id OR auth.uid() = worker_id);

-- 2. Allow users involved in a booking to delete disputes (during cascade).
DROP POLICY IF EXISTS "Disputes deletable by initiator" ON disputes;
CREATE POLICY "Disputes deletable by initiator" ON disputes
FOR DELETE USING (auth.uid() = initiator_id);

-- 3. Ensure users can delete their messages (during cascade).
DROP POLICY IF EXISTS "Messages deletable by involved users" ON messages;
CREATE POLICY "Messages deletable by involved users" ON messages
FOR DELETE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- 4. Re-enforce Clients can delete their own tasks explicitly (just in case).
DROP POLICY IF EXISTS "Clients delete own tasks" ON posted_tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON posted_tasks;
CREATE POLICY "Clients delete own tasks" ON posted_tasks
FOR DELETE USING (auth.uid() = client_id);
