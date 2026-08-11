-- Location Releases & Waitlist Schema Migration for Velgo

CREATE TABLE IF NOT EXISTS public.location_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state TEXT NOT NULL,
    lga TEXT, -- NULL means setting applies to entire state
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(state, lga)
);

CREATE TABLE IF NOT EXISTS public.location_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    contact_info TEXT NOT NULL,
    state TEXT NOT NULL,
    lga TEXT NOT NULL,
    area TEXT,
    role_intent TEXT DEFAULT 'client', -- 'client' or 'worker'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Sub-LGA Area Granularity Columns
ALTER TABLE public.posted_tasks ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS area TEXT;

-- Row Level Security & Policies
ALTER TABLE public.location_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view location settings" ON public.location_settings;
CREATE POLICY "Public can view location settings" ON public.location_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage location settings" ON public.location_settings;
CREATE POLICY "Admins can manage location settings" ON public.location_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin')
);

DROP POLICY IF EXISTS "Anyone can join location waitlist" ON public.location_waitlist;
CREATE POLICY "Anyone can join location waitlist" ON public.location_waitlist FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can view waitlist" ON public.location_waitlist;
CREATE POLICY "Admins can view waitlist" ON public.location_waitlist FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role::text = 'admin')
);

GRANT ALL ON public.location_settings TO authenticated, service_role, anon;
GRANT ALL ON public.location_waitlist TO authenticated, service_role, anon;
