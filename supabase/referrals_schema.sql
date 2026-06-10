-- ==========================================
-- VELGO V2: REFERRAL & PROMO CODES SYSTEM
-- ==========================================

-- 1. Add referrer_id to profiles to track who referred whom
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referrer_id UUID REFERENCES public.profiles(id) DEFAULT NULL;

-- 2. Create promo_codes table for the milestone rewards
CREATE TABLE IF NOT EXISTS public.promo_codes (
    code TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    discount_percent INTEGER NOT NULL,
    is_used BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
);

-- 3. Enable Row Level Security (RLS) on promo_codes
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
-- Users can view their own promo codes
CREATE POLICY "Users can view their own promo codes" 
    ON public.promo_codes 
    FOR SELECT 
    USING (auth.uid() = user_id);

-- Users can insert their own promo codes (needed since the client generates them upon reaching a milestone)
CREATE POLICY "Users can insert their own promo codes" 
    ON public.promo_codes 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

-- Users can update/redeem their own promo codes (to mark as used)
CREATE POLICY "Users can update their own promo codes" 
    ON public.promo_codes 
    FOR UPDATE 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admins can manage all promo codes for troubleshooting
CREATE POLICY "Admins can manage all promo codes" 
    ON public.promo_codes 
    FOR ALL 
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
