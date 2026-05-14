-- 1. Intelligently remove all existing triggers related to task counts to prevent duplicates
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT tgname, relname
        FROM pg_trigger
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        -- Find triggers that have 'increment' or 'task_count' in their name
        WHERE tgname LIKE '%task_count%' OR tgname LIKE '%increment%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', trigger_record.tgname, trigger_record.relname);
    END LOOP;
END $$;

-- 2. Clean up any related legacy functions
DROP TRIGGER IF EXISTS trg_increment_on_post ON posted_tasks;
DROP FUNCTION IF EXISTS handle_task_count_on_post() CASCADE;
DROP FUNCTION IF EXISTS handle_task_count_on_acceptance() CASCADE;

-- 3. Create a single, strictly controlled function for accepted bookings
CREATE OR REPLACE FUNCTION handle_task_count_on_booking_accept()
RETURNS TRIGGER AS $$
BEGIN
  -- ONLY execute if status JUST changed from 'pending' to 'accepted'
  IF NEW.status = 'accepted' AND (OLD.status = 'pending' OR OLD.status IS NULL) THEN
    
    -- Increment the worker and client task counts respectfully
    UPDATE profiles SET task_count = COALESCE(task_count, 0) + 1 WHERE id = NEW.worker_id;
    UPDATE profiles SET task_count = COALESCE(task_count, 0) + 1 WHERE id = NEW.client_id;
    
    -- Handle grouping logic (Job applications where multiple apply for same task)
    IF NEW.task_id IS NOT NULL THEN
      -- Automatically decline other pending applications for this task
      UPDATE bookings 
      SET status = 'declined' 
      WHERE task_id = NEW.task_id 
        AND id != NEW.id 
        AND status = 'pending';
        
      -- Automatically change the posted task to assigned
      UPDATE posted_tasks
      SET status = 'assigned', assigned_worker_id = NEW.worker_id
      WHERE id = NEW.task_id AND status = 'open';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Re-attach only ONE trigger to bookings, monitoring updates explicitly
CREATE TRIGGER trg_booking_accepted_task_count
AFTER UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION handle_task_count_on_booking_accept();

-- 5. Complete accurate mathematical recount
-- Reset everything to zero to establish a baseline
UPDATE profiles SET task_count = 0;

-- Recount based entirely on 'accepted' or 'completed' tasks
WITH accurate_counts AS (
  SELECT profile_id, SUM(count) as total_count FROM (
    SELECT worker_id AS profile_id, COUNT(*) as count
    FROM bookings
    WHERE status IN ('accepted', 'completed')
    GROUP BY worker_id
    UNION ALL
    SELECT client_id AS profile_id, COUNT(*) as count
    FROM bookings
    WHERE status IN ('accepted', 'completed')
    GROUP BY client_id
  ) as combined
  GROUP BY profile_id
)
UPDATE profiles
SET task_count = COALESCE(accurate_counts.total_count, 0)
FROM accurate_counts
WHERE profiles.id = accurate_counts.profile_id;
