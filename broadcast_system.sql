
-- 1. Table for Global Broadcasts
CREATE TABLE IF NOT EXISTS public.broadcasts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    target_role TEXT CHECK (target_role IN ('all', 'worker', 'client')) DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Table for Push Notification Subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_subscription UNIQUE (subscription)
);

-- 3. Enable Row Level Security
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Policies for Broadcasts
-- Users can see broadcasts targeted at them or 'all'
CREATE POLICY "Users can view relevant broadcasts" ON public.broadcasts
    FOR SELECT USING (
        target_role = 'all' OR 
        target_role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    );

-- Only Admins can insert broadcasts
CREATE POLICY "Admins can create broadcasts" ON public.broadcasts
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 5. Policies for Push Subscriptions
-- Users can manage their own subscriptions
CREATE POLICY "Users manage own subscriptions" ON public.push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- 6. Grant Permissions
GRANT ALL ON public.broadcasts TO authenticated;
GRANT ALL ON public.push_subscriptions TO authenticated;
