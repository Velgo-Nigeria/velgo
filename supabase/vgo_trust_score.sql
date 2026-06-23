-- ===========================================
-- VGO-TRUST-SCORE: Add Trust Score to Profiles
-- ===========================================

-- 1. Add trust_score column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 0;

-- 2. Create a function to calculate trust score dynamically
CREATE OR REPLACE FUNCTION update_trust_score_for_worker(worker_uuid UUID)
RETURNS VOID AS $$
DECLARE
    new_score INTEGER := 0;
    completed_jobs_count INTEGER := 0;
    verified_reviews_score INTEGER := 0;
    prof_verified BOOLEAN := false;
    sub_tier TEXT := 'basic';
BEGIN
    -- Get base profile info
    SELECT is_verified, COALESCE(subscription_tier, 'basic') 
    INTO prof_verified, sub_tier
    FROM public.profiles 
    WHERE id = worker_uuid;

    -- Add points for verification
    IF prof_verified = TRUE THEN
        new_score := new_score + 30;
    END IF;

    -- Add points for subscription tier
    IF sub_tier = 'pro' THEN
        new_score := new_score + 10;
    ELSIF sub_tier = 'enterprise' THEN
        new_score := new_score + 25;
    END IF;

    -- Get completed jobs count
    SELECT COUNT(*) INTO completed_jobs_count
    FROM public.bookings
    WHERE worker_id = worker_uuid AND status = 'completed';

    -- Add points for completed jobs (+5 per job)
    new_score := new_score + (completed_jobs_count * 5);

    -- Get points from verified reviews (ratings)
    -- e.g. a 5-star rating gives +10 points, 4-star gives +8 points, etc.
    SELECT COALESCE(SUM(rating * 2), 0) INTO verified_reviews_score
    FROM public.bookings
    WHERE worker_id = worker_uuid AND rating IS NOT NULL AND status = 'completed';

    -- Add review points
    new_score := new_score + verified_reviews_score;

    -- Update the profile's trust score
    UPDATE public.profiles
    SET trust_score = new_score
    WHERE id = worker_uuid;
END;
$$ LANGUAGE plpgsql;

-- 3. Create a trigger function for bookings
CREATE OR REPLACE FUNCTION trg_update_trust_score_on_booking()
RETURNS TRIGGER AS $$
BEGIN
    -- If a booking is inserted or updated, recount the worker's trust score
    IF TG_OP = 'INSERT' THEN
        PERFORM update_trust_score_for_worker(NEW.worker_id);
    ELSIF TG_OP = 'UPDATE' THEN
        -- Only recalculate if status or rating changes
        IF NEW.status IS DISTINCT FROM OLD.status OR NEW.rating IS DISTINCT FROM OLD.rating THEN
            PERFORM update_trust_score_for_worker(NEW.worker_id);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create a trigger function for profile updates (if verification changes)
CREATE OR REPLACE FUNCTION trg_update_trust_score_on_profile()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
        PERFORM update_trust_score_for_worker(NEW.id);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach triggers
DROP TRIGGER IF EXISTS trg_trust_score_booking ON public.bookings;
CREATE TRIGGER trg_trust_score_booking
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION trg_update_trust_score_on_booking();

DROP TRIGGER IF EXISTS trg_trust_score_profile ON public.profiles;
CREATE TRIGGER trg_trust_score_profile
AFTER UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.is_verified IS DISTINCT FROM OLD.is_verified OR NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier)
EXECUTE FUNCTION trg_update_trust_score_on_profile();

-- 6. Recalculate once for all profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT id FROM public.profiles LOOP
        PERFORM update_trust_score_for_worker(r.id);
    END LOOP;
END;
$$;
