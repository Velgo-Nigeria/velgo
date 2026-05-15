-- Missing RLS Policies for Velgo

-- 1. Posted Tasks
DROP POLICY IF EXISTS "Clients can update their own tasks" ON posted_tasks;
CREATE POLICY "Clients can update their own tasks" ON posted_tasks FOR UPDATE USING (auth.uid() = client_id);

DROP POLICY IF EXISTS "Clients can delete their own tasks" ON posted_tasks;
CREATE POLICY "Clients can delete their own tasks" ON posted_tasks FOR DELETE USING (auth.uid() = client_id);

-- 2. Bookings
DROP POLICY IF EXISTS "Bookings update involved" ON bookings;
CREATE POLICY "Bookings update involved" ON bookings FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = worker_id);

DROP POLICY IF EXISTS "Bookings delete involved" ON bookings;
CREATE POLICY "Bookings delete involved" ON bookings FOR DELETE USING (auth.uid() = client_id OR auth.uid() = worker_id);

-- 3. Messages
DROP POLICY IF EXISTS "Messages update sender" ON messages;
CREATE POLICY "Messages update sender" ON messages FOR UPDATE USING (auth.uid() = sender_id);
