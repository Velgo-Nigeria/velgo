-- 1. Backfill detailed ratings for older reviews (copying the main rating into the new detailed columns)
UPDATE bookings 
SET 
  worker_communication_rating = rating,
  worker_quality_rating = rating,
  worker_punctuality_rating = rating
WHERE rating IS NOT NULL AND worker_communication_rating IS NULL;

UPDATE bookings
SET
  client_communication_rating = client_rating,
  client_fairness_rating = client_rating
WHERE client_rating IS NOT NULL AND client_communication_rating IS NULL;

-- 2. Recalculate and update the metrics on the Profiles table for all users
UPDATE profiles p
SET 
    worker_rating_count = (SELECT COUNT(*) FROM bookings WHERE worker_id = p.id AND rating IS NOT NULL),
    worker_avg_rating = (SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0) FROM bookings WHERE worker_id = p.id AND rating IS NOT NULL),
    worker_avg_communication = (SELECT COALESCE(ROUND(AVG(worker_communication_rating)::numeric, 2), 0) FROM bookings WHERE worker_id = p.id AND worker_communication_rating IS NOT NULL),
    worker_avg_quality = (SELECT COALESCE(ROUND(AVG(worker_quality_rating)::numeric, 2), 0) FROM bookings WHERE worker_id = p.id AND worker_quality_rating IS NOT NULL),
    worker_avg_punctuality = (SELECT COALESCE(ROUND(AVG(worker_punctuality_rating)::numeric, 2), 0) FROM bookings WHERE worker_id = p.id AND worker_punctuality_rating IS NOT NULL),
    
    client_rating_count = (SELECT COUNT(*) FROM bookings WHERE client_id = p.id AND client_rating IS NOT NULL),
    client_avg_rating = (SELECT COALESCE(ROUND(AVG(client_rating)::numeric, 2), 0) FROM bookings WHERE client_id = p.id AND client_rating IS NOT NULL),
    client_avg_communication = (SELECT COALESCE(ROUND(AVG(client_communication_rating)::numeric, 2), 0) FROM bookings WHERE client_id = p.id AND client_communication_rating IS NOT NULL),
    client_avg_fairness = (SELECT COALESCE(ROUND(AVG(client_fairness_rating)::numeric, 2), 0) FROM bookings WHERE client_id = p.id AND client_fairness_rating IS NOT NULL);
