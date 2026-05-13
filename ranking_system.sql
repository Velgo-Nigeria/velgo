-- 1. Add profile_score column to Profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS profile_score NUMERIC(5,2) DEFAULT 0.00;

-- 2. Create function to recalculate score
CREATE OR REPLACE FUNCTION calculate_profile_score()
RETURNS TRIGGER AS $$
DECLARE
    new_score NUMERIC(5,2) := 0.00;
BEGIN
    -- 1. Verification (20 points)
    IF NEW.is_verified = true THEN
        new_score := new_score + 20.00;
    END IF;

    -- 2. Profile Completeness (Max 25 points)
    IF NEW.avatar_url IS NOT NULL AND NEW.avatar_url != '' THEN
        new_score := new_score + 5.00;
    END IF;
    IF NEW.bio IS NOT NULL AND NEW.bio != '' THEN
        new_score := new_score + 5.00;
    END IF;
    IF NEW.bank_name IS NOT NULL AND NEW.bank_name != '' AND NEW.account_number IS NOT NULL AND NEW.account_number != '' THEN
        new_score := new_score + 10.00;
    END IF;
    IF NEW.emergency_contact_name IS NOT NULL AND NEW.emergency_contact_name != '' THEN
        new_score := new_score + 5.00;
    END IF;

    -- 3. Subscription Tier (Up to 30 points)
    IF NEW.subscription_tier = 'lite' THEN
        new_score := new_score + 5.00;
    ELSIF NEW.subscription_tier = 'standard' THEN
        new_score := new_score + 10.00;
    ELSIF NEW.subscription_tier = 'pro' THEN
        new_score := new_score + 15.00;
    ELSIF NEW.subscription_tier = 'enterprise' THEN
        new_score := new_score + 25.00;
    END IF;

    -- 4. Reputation / Performance (Max ~50+ points)
    -- Jobs done: 1 point per job, up to 10 points max
    new_score := new_score + LEAST(10.00, COALESCE(NEW.worker_rating_count, 0)::numeric);

    -- Average Rating: max 10 points (avg_rating * 2)
    new_score := new_score + (COALESCE(NEW.worker_avg_rating, 0) * 2);

    -- Punctuality Badge criteria: +5 points if avg >= 4.5 and jobs > 0
    IF NEW.worker_avg_punctuality >= 4.5 AND COALESCE(NEW.worker_rating_count, 0) > 0 THEN
        new_score := new_score + 5.00;
    END IF;

    -- Quality Badge criteria: +5 points if avg >= 4.5 and jobs > 0
    IF NEW.worker_avg_quality >= 4.5 AND COALESCE(NEW.worker_rating_count, 0) > 0 THEN
        new_score := new_score + 5.00;
    END IF;
    
    -- Top Rated Pro Badge criteria: +5 points if jobs >= 10
    IF COALESCE(NEW.worker_rating_count, 0) >= 10 THEN
        new_score := new_score + 5.00;
    END IF;

    NEW.profile_score := new_score;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create Trigger attached to profiles table
DROP TRIGGER IF EXISTS trg_calculate_profile_score ON profiles;
CREATE TRIGGER trg_calculate_profile_score
BEFORE INSERT OR UPDATE OF 
    is_verified, avatar_url, bio, bank_name, account_number, emergency_contact_name,
    subscription_tier, worker_rating_count, worker_avg_rating, worker_avg_punctuality, worker_avg_quality
ON profiles
FOR EACH ROW
EXECUTE FUNCTION calculate_profile_score();

-- 4. Backfill existing profiles
UPDATE profiles SET is_verified = is_verified; -- This will trigger the calculation for all rows
