-- Phase 1. Clean up old triggers and functions
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT tgname, relname
        FROM pg_trigger
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        WHERE tgname LIKE '%task_count%' OR tgname LIKE '%increment%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', trigger_record.tgname, trigger_record.relname);
    END LOOP;
END $$;
DROP FUNCTION IF EXISTS handle_task_count_on_post() CASCADE;
DROP FUNCTION IF EXISTS handle_task_count_on_acceptance() CASCADE;
DROP FUNCTION IF EXISTS handle_task_count_on_booking_accept() CASCADE;

-- Phase 2. Drop task_count column AND recreate the profile update policy 
ALTER TABLE profiles DROP COLUMN IF EXISTS task_count CASCADE;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" 
ON profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Phase 3. Add tokens column (Starts at 0 as users must purchase packs)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tokens INTEGER DEFAULT 0;

-- Phase 4. Create Atomic Booking Acceptance RPC (Spends 1 token securely)
CREATE OR REPLACE FUNCTION accept_booking_with_token(p_booking_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_tokens INTEGER;
    v_booking_status TEXT;
BEGIN
    -- 1. Grab current token count (Lock the row for update to prevent double-spending race conditions)
    SELECT tokens INTO v_tokens FROM profiles WHERE id = p_user_id FOR UPDATE;
    
    -- 2. Verify tokens
    IF v_tokens IS NULL OR v_tokens <= 0 THEN
        RAISE EXCEPTION 'INSUFFICIENT_TOKENS';
    END IF;

    -- 3. Check booking is not already accepted (prevent double charging)
    SELECT status INTO v_booking_status FROM bookings WHERE id = p_booking_id;
    IF v_booking_status = 'accepted' THEN
        RETURN TRUE; -- Early exit if somehow already accepted
    END IF;

    -- 4. Deduct Token
    UPDATE profiles SET tokens = tokens - 1 WHERE id = p_user_id;

    -- 5. Mark Booking as Accepted
    UPDATE bookings SET status = 'accepted' WHERE id = p_booking_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Phase 5. Create Token Refill RPC (for when users buy a pack)
CREATE OR REPLACE FUNCTION add_tokens(p_user_id UUID, p_amount INTEGER)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE profiles SET tokens = COALESCE(tokens, 0) + p_amount WHERE id = p_user_id;
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
