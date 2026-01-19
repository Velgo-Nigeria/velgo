-- VELGO NIGERIA: CONSOLIDATED DATABASE SETUP
-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  role TEXT CHECK (role IN ('client', 'worker', 'admin')) DEFAULT 'client',
  client_type TEXT CHECK (client_type IN ('personal', 'enterprise')) DEFAULT 'personal',
  subscription_tier TEXT DEFAULT 'basic',
  task_count INTEGER DEFAULT 0,
  bank_name TEXT,
  account_number TEXT,
  account_name TEXT,
  address TEXT,
  state TEXT,
  lga TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  bio TEXT,
  category TEXT,
  subcategory TEXT,
  starting_price INTEGER DEFAULT 0,
  avatar_url TEXT,
  nin_image_url TEXT,
  instagram_handle TEXT,
  portfolio_url TEXT,
  is_verified BOOLEAN DEFAULT false,
  theme_mode TEXT DEFAULT 'auto',
  last_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notification_preferences JSONB DEFAULT '{"jobAlerts": true, "renewals": true, "reviews": true, "security": true, "promotions": false}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posted_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget INTEGER NOT NULL,
  location TEXT NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  status TEXT CHECK (status IN ('open', 'assigned', 'completed')) DEFAULT 'open',
  urgency TEXT CHECK (urgency IN ('normal', 'urgent', 'emergency')) DEFAULT 'normal',
  assigned_worker_id UUID REFERENCES profiles(id),
  category TEXT NOT NULL,
  subcategory TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  task_id UUID REFERENCES posted_tasks(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'completed', 'cancelled')) DEFAULT 'pending',
  quote_price INTEGER,
  rating INTEGER,
  review TEXT,
  is_punctual BOOLEAN,
  client_rating INTEGER,
  client_review TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  admin_reply BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS safety_reports (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  reporter_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  details TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_name TEXT NOT NULL,
  comment TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  subscription JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. TRIGGERS
CREATE OR REPLACE FUNCTION handle_task_count_on_acceptance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    UPDATE profiles SET task_count = task_count + 1 WHERE id = NEW.worker_id;
    UPDATE profiles SET task_count = task_count + 1 WHERE id = NEW.client_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_task_count
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION handle_task_count_on_acceptance();

CREATE OR REPLACE FUNCTION handle_task_count_on_post()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE profiles SET task_count = task_count + 1 WHERE id = NEW.client_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_on_post
AFTER INSERT ON posted_tasks
FOR EACH ROW
EXECUTE FUNCTION handle_task_count_on_post();

-- 4. RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles viewable" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE posted_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tasks viewable" ON posted_tasks FOR SELECT USING (true);
CREATE POLICY "Clients insert tasks" ON posted_tasks FOR INSERT WITH CHECK (auth.uid() = client_id);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bookings viewable involved" ON bookings FOR SELECT USING (auth.uid() = client_id OR auth.uid() = worker_id);
CREATE POLICY "Bookings insert involved" ON bookings FOR INSERT WITH CHECK (auth.uid() = client_id OR auth.uid() = worker_id);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Messages viewable involved" ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Messages insert sender" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);