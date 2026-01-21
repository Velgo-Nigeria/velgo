
-- 1. Drop existing table to reset schema (Data loss acceptable for this cache table)
DROP TABLE IF EXISTS public.push_subscriptions CASCADE;

-- 2. Create new table with UUID Primary Key (allows multiple devices per user)
CREATE TABLE public.push_subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    subscription JSONB NOT NULL,
    user_agent TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Ensure the exact same subscription JSON isn't added twice
    CONSTRAINT unique_subscription_json UNIQUE (subscription)
);

-- 3. Enable Security
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Allow users to Insert/Update/Delete their OWN subscriptions
CREATE POLICY "Users manage own subscriptions" ON public.push_subscriptions
    FOR ALL USING (auth.uid() = user_id);

-- 5. Grant Permissions
GRANT ALL ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
