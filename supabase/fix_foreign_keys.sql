-- FIX FOREIGN KEYS FOR ACCOUNT DELETION
-- Run this in Supabase SQL Editor

-- 1. Fix Bookings Table (The one causing your error)
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
-- If Client deletes account -> Delete the Job Post (CASCADE)
-- If Assigned Worker deletes account -> Unassign them but keep the Job Post (SET NULL)
ALTER TABLE posted_tasks
DROP CONSTRAINT IF EXISTS posted_tasks_client_id_fkey,
DROP CONSTRAINT IF EXISTS posted_tasks_assigned_worker_id_fkey;

ALTER TABLE posted_tasks
ADD CONSTRAINT posted_tasks_client_id_fkey
FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE CASCADE;

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