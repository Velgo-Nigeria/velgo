-- 1. Add detailed metrics columns to Bookings
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS worker_communication_rating INTEGER,
ADD COLUMN IF NOT EXISTS worker_quality_rating INTEGER,
ADD COLUMN IF NOT EXISTS worker_punctuality_rating INTEGER,
ADD COLUMN IF NOT EXISTS client_communication_rating INTEGER,
ADD COLUMN IF NOT EXISTS client_fairness_rating INTEGER;

-- 2. Add pre-calculated aggregate fields to Profiles (This prevents the app from lagging!)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS worker_rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS worker_avg_rating NUMERIC(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS worker_avg_communication NUMERIC(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS worker_avg_quality NUMERIC(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS worker_avg_punctuality NUMERIC(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS client_rating_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS client_avg_rating NUMERIC(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS client_avg_communication NUMERIC(3,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS client_avg_fairness NUMERIC(3,2) DEFAULT 0.00;

-- 3. Create a Function to automatically update Worker aggregations when a review is left
CREATE OR REPLACE FUNCTION update_worker_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rating IS NOT NULL THEN
    UPDATE profiles
    SET 
        worker_rating_count = (SELECT COUNT(*) FROM bookings WHERE worker_id = NEW.worker_id AND rating IS NOT NULL),
        worker_avg_rating = (SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0) FROM bookings WHERE worker_id = NEW.worker_id AND rating IS NOT NULL),
        worker_avg_communication = (SELECT COALESCE(ROUND(AVG(worker_communication_rating)::numeric, 2), 0) FROM bookings WHERE worker_id = NEW.worker_id AND worker_communication_rating IS NOT NULL),
        worker_avg_quality = (SELECT COALESCE(ROUND(AVG(worker_quality_rating)::numeric, 2), 0) FROM bookings WHERE worker_id = NEW.worker_id AND worker_quality_rating IS NOT NULL),
        worker_avg_punctuality = (SELECT COALESCE(ROUND(AVG(worker_punctuality_rating)::numeric, 2), 0) FROM bookings WHERE worker_id = NEW.worker_id AND worker_punctuality_rating IS NOT NULL)
    WHERE id = NEW.worker_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create the Trigger for Worker Reviews
DROP TRIGGER IF EXISTS trg_update_worker_ratings ON bookings;
CREATE TRIGGER trg_update_worker_ratings
AFTER INSERT OR UPDATE OF rating, worker_communication_rating, worker_quality_rating, worker_punctuality_rating
ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_worker_ratings();

-- 5. Create a Function to automatically update Client aggregations when a worker reviews them
CREATE OR REPLACE FUNCTION update_client_ratings()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_rating IS NOT NULL THEN
    UPDATE profiles
    SET 
        client_rating_count = (SELECT COUNT(*) FROM bookings WHERE client_id = NEW.client_id AND client_rating IS NOT NULL),
        client_avg_rating = (SELECT COALESCE(ROUND(AVG(client_rating)::numeric, 2), 0) FROM bookings WHERE client_id = NEW.client_id AND client_rating IS NOT NULL),
        client_avg_communication = (SELECT COALESCE(ROUND(AVG(client_communication_rating)::numeric, 2), 0) FROM bookings WHERE client_id = NEW.client_id AND client_communication_rating IS NOT NULL),
        client_avg_fairness = (SELECT COALESCE(ROUND(AVG(client_fairness_rating)::numeric, 2), 0) FROM bookings WHERE client_id = NEW.client_id AND client_fairness_rating IS NOT NULL)
    WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create the Trigger for Client Reviews
DROP TRIGGER IF EXISTS trg_update_client_ratings ON bookings;
CREATE TRIGGER trg_update_client_ratings
AFTER INSERT OR UPDATE OF client_rating, client_communication_rating, client_fairness_rating
ON bookings
FOR EACH ROW
EXECUTE FUNCTION update_client_ratings();
