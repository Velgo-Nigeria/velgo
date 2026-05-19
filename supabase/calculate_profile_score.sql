-- Ensure the subscription_tier column exists to prevent errors
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'basic';

-- 1. Create the function to calculate the Visibility Score
CREATE OR REPLACE FUNCTION calculate_profile_score()
RETURNS TRIGGER AS $$
DECLARE
    score NUMERIC := 0;
BEGIN
    -- Verify ID (+20 Pts)
    IF NEW.is_verified = true THEN
        score := score + 20;
    END IF;

    -- Add Bank Details (+10 Pts)
    IF NEW.bank_name IS NOT NULL AND trim(NEW.bank_name) != '' 
       AND NEW.account_number IS NOT NULL AND trim(NEW.account_number) != '' THEN
        score := score + 10;
    END IF;

    -- Complete Bio & Avatar (+10 Pts)
    IF NEW.bio IS NOT NULL AND trim(NEW.bio) != '' 
       AND NEW.avatar_url IS NOT NULL AND trim(NEW.avatar_url) != '' THEN
        score := score + 10;
    END IF;

    -- Upgrade to Pro/Enterprise Tier (Up to +25 Pts)
    IF NEW.subscription_tier = 'enterprise' THEN
        score := score + 25;
    ELSIF NEW.subscription_tier = 'pro' THEN
        score := score + 15;
    END IF;

    -- Maintain 5-Star Ratings & Badges (Up to +50 Pts)
    -- Maps 1.0 to 10 Pts, 2.5 to 25 Pts, 4.5 to 45 Pts, 5.0 to 50 Pts
    IF NEW.avg_rating IS NOT NULL AND NEW.avg_rating > 0 THEN
        score := score + (NEW.avg_rating * 10);
    END IF;

    -- Assign the calculated score
    NEW.profile_score := ROUND(score);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the Trigger to the Profiles table (For both INSERT and UPDATE)
DROP TRIGGER IF EXISTS trg_calculate_visibility_score ON profiles;
CREATE TRIGGER trg_calculate_visibility_score
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE calculate_profile_score();

-- 3. (Optional) Trigger a recalculation for all existing profiles immediately
UPDATE profiles SET profile_score = profile_score;
