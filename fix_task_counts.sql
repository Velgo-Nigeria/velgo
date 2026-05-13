-- 1. Drop the post task trigger so it no longer increments linearly on task post
DROP TRIGGER IF EXISTS trg_increment_on_post ON posted_tasks;
DROP FUNCTION IF EXISTS handle_task_count_on_post();

-- 2. Update the booking_status ENUM (if applicable) and constraints
-- We will catch 'booking_status does not exist' if it doesn't, but usually it works.
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'declined';

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check1;
-- Just in case it's a text check on some instances (casting to text to avoid enum mismatch):
ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status::text IN ('pending', 'accepted', 'completed', 'cancelled', 'declined'));

-- 3. Replace the booking acceptance trigger
CREATE OR REPLACE FUNCTION handle_task_count_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Increment for worker
    UPDATE profiles SET task_count = task_count + 1 WHERE id = NEW.worker_id;
    -- Increment for client
    UPDATE profiles SET task_count = task_count + 1 WHERE id = NEW.client_id;
    
    -- If this is an application for a posted task, decline other applications and assign task
    IF NEW.task_id IS NOT NULL THEN
      -- Decline all other pending applications for this task
      UPDATE bookings 
      SET status = 'declined' 
      WHERE task_id = NEW.task_id 
        AND id != NEW.id 
        AND status = 'pending';
        
      -- Automatically assign the task
      UPDATE posted_tasks
      SET status = 'assigned', assigned_worker_id = NEW.worker_id
      WHERE id = NEW.task_id AND status = 'open';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recount task_count for all users to ensure accuracy
UPDATE profiles
SET task_count = COALESCE((
  SELECT COUNT(*)
  FROM bookings
  WHERE (bookings.worker_id = profiles.id OR bookings.client_id = profiles.id)
    AND bookings.status IN ('accepted', 'completed')
), 0);
