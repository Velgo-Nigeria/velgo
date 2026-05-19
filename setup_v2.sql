-- ==========================================
-- VELGO V2: UNIFIED USER ARCHITECTURE
-- ==========================================

-- 1. ENUMS
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE task_status AS ENUM ('open', 'assigned', 'completed', 'cancelled');
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'completed', 'cancelled', 'declined', 'disputed');

-- 2. PROFILES TABLE
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    role user_role DEFAULT 'user',
    tokens INTEGER DEFAULT 5,
    bio TEXT,
    category TEXT,
    subcategory TEXT,
    hourly_rate INTEGER,
    state TEXT,
    lga TEXT,
    address TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    phone_number TEXT,
    avatar_url TEXT,
    nin_image_url TEXT,
    instagram_handle TEXT,
    portfolio_url TEXT,
    updated_at TIMESTAMP WITH TIME ZONE,
    starting_price INTEGER,
    bank_name TEXT,
    account_number TEXT,
    account_name TEXT,
    service_title TEXT,
    last_reset_date TIMESTAMP WITH TIME ZONE,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    theme_mode TEXT DEFAULT 'auto',
    notification_preferences JSONB,
    worker_rating_count INTEGER DEFAULT 0,
    worker_avg_rating NUMERIC(3,2) DEFAULT 0.00,
    
    -- Metrics
    task_count INTEGER DEFAULT 0, -- Tasks they requested
    job_count INTEGER DEFAULT 0,  -- Tasks they completed
    
    rating_count INTEGER DEFAULT 0,
    avg_rating NUMERIC(3,2) DEFAULT 0.00,
    avg_quality NUMERIC(3,2) DEFAULT 0.00,
    avg_communication NUMERIC(3,2) DEFAULT 0.00,
    avg_punctuality NUMERIC(3,2) DEFAULT 0.00,
    
    is_verified BOOLEAN DEFAULT false,
    profile_score NUMERIC DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile upon signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, tokens)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    'user', 
    5 -- Initial free tokens
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. POSTED TASKS
CREATE TABLE posted_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL,
    location TEXT NOT NULL, -- or state/city
    budget INTEGER NOT NULL,
    status task_status DEFAULT 'open',
    assigned_worker_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE posted_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tasks viewable by everyone" ON posted_tasks FOR SELECT USING (true);
CREATE POLICY "Users can insert tasks" ON posted_tasks FOR INSERT WITH CHECK (auth.uid() = client_id);
CREATE POLICY "Users can update own tasks" ON posted_tasks FOR UPDATE USING (auth.uid() = client_id);
CREATE POLICY "Users can delete own tasks" ON posted_tasks FOR DELETE USING (auth.uid() = client_id);


-- 4. BOOKINGS
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    task_id UUID REFERENCES posted_tasks(id) ON DELETE CASCADE,
    status booking_status DEFAULT 'pending',
    
    -- Ratings (stored directly on the transaction)
    rating INTEGER, -- overall
    quality_rating INTEGER,
    communication_rating INTEGER,
    punctuality_rating INTEGER,
    review_text TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bookings viewable by involved users" ON bookings 
FOR SELECT USING (auth.uid() = client_id OR auth.uid() = worker_id);
CREATE POLICY "Bookings insertable by involved users" ON bookings 
FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = worker_id);
CREATE POLICY "Bookings updatable by involved users" ON bookings 
FOR UPDATE USING (auth.uid() = client_id OR auth.uid() = worker_id);


-- 5. MESSAGES
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Messages viewable by sender or receiver" ON messages 
FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Messages insertable by sender" ON messages 
FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Messages updatable by receiver" ON messages 
FOR UPDATE USING (auth.uid() = receiver_id);


-- 6. SUPPORT MESSAGES
CREATE TABLE support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert support messages" ON support_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own support messages" ON support_messages FOR SELECT USING (auth.uid() = user_id);


-- 7. DISPUTES
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
    initiator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own disputes via bookings" ON disputes
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.id = disputes.booking_id 
    AND (bookings.client_id = auth.uid() OR bookings.worker_id = auth.uid())
  )
);
CREATE POLICY "Users can insert disputes for their bookings" ON disputes
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.id = booking_id 
    AND (bookings.client_id = auth.uid() OR bookings.worker_id = auth.uid())
  )
  AND auth.uid() = initiator_id
);

-- ==========================================
-- TOKEN DEDUCTION LOGIC
-- ==========================================

-- Function to accept a booking/application and deduct from BOTH parties
CREATE OR REPLACE FUNCTION accept_booking_with_mutual_deduction(p_booking_id UUID, p_accepter_id UUID)
RETURNS boolean AS $$
DECLARE
    v_client_id UUID;
    v_worker_id UUID;
    v_client_tokens INTEGER;
    v_worker_tokens INTEGER;
    v_booking_status booking_status;
BEGIN
    -- 1. Get booking details
    SELECT client_id, worker_id, status 
    INTO v_client_id, v_worker_id, v_booking_status
    FROM bookings
    WHERE id = p_booking_id;
    
    IF v_booking_status != 'pending' THEN
        RAISE EXCEPTION 'Booking is not pending.';
    END IF;

    -- 2. Verify accepter is part of the booking
    IF p_accepter_id != v_client_id AND p_accepter_id != v_worker_id THEN
        RAISE EXCEPTION 'Unauthorized: Accepter is not part of this booking.';
    END IF;

    -- 3. Check tokens for BOTH
    SELECT tokens INTO v_client_tokens FROM profiles WHERE id = v_client_id;
    SELECT tokens INTO v_worker_tokens FROM profiles WHERE id = v_worker_id;

    IF v_client_tokens < 1 THEN
        RAISE EXCEPTION 'INSUFFICIENT_TOKENS_CLIENT';
    END IF;
    
    IF v_worker_tokens < 1 THEN
        RAISE EXCEPTION 'INSUFFICIENT_TOKENS_WORKER';
    END IF;

    -- 4. Deduct tokens
    UPDATE profiles SET tokens = tokens - 1 WHERE id = v_client_id;
    UPDATE profiles SET tokens = tokens - 1 WHERE id = v_worker_id;

    -- 5. Update booking status
    UPDATE bookings SET status = 'accepted', updated_at = NOW() WHERE id = p_booking_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ==========================================
-- METRICS (RATINGS & TASK COUNTS)
-- ==========================================

CREATE OR REPLACE FUNCTION update_profile_metrics_on_booking()
RETURNS trigger AS $$
BEGIN
    -- Only trigger when a booking is COMPLETED and HAS A RATING
    IF NEW.status = 'completed' AND NEW.rating IS NOT NULL THEN
        -- We apply ratings uniquely to the WORKER (who provided the service)
        -- Since users are unified, the "worker" in this transaction receives the rating.
        UPDATE profiles
        SET rating_count = (SELECT COUNT(*) FROM bookings WHERE worker_id = NEW.worker_id AND rating IS NOT NULL AND status='completed'),
            avg_rating = (SELECT COALESCE(ROUND(AVG(rating)::numeric, 2), 0) FROM bookings WHERE worker_id = NEW.worker_id AND rating IS NOT NULL AND status='completed'),
            avg_quality = (SELECT COALESCE(ROUND(AVG(quality_rating)::numeric, 2), 0) FROM bookings WHERE worker_id = NEW.worker_id AND quality_rating IS NOT NULL AND status='completed'),
            avg_communication = (SELECT COALESCE(ROUND(AVG(communication_rating)::numeric, 2), 0) FROM bookings WHERE worker_id = NEW.worker_id AND communication_rating IS NOT NULL AND status='completed'),
            avg_punctuality = (SELECT COALESCE(ROUND(AVG(punctuality_rating)::numeric, 2), 0) FROM bookings WHERE worker_id = NEW.worker_id AND punctuality_rating IS NOT NULL AND status='completed')
        WHERE id = NEW.worker_id;
    END IF;

    -- Update counts when Accepted
    IF (TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status = 'accepted') THEN
        UPDATE profiles SET job_count = job_count + 1 WHERE id = NEW.worker_id;
        UPDATE profiles SET task_count = task_count + 1 WHERE id = NEW.client_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_update_metrics
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW EXECUTE PROCEDURE update_profile_metrics_on_booking();


-- Automatically set updated_at on bookings
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_bookings_updated_at
BEFORE UPDATE ON bookings
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- That's it for the core schema!
