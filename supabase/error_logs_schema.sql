-- Run this in your Supabase SQL Editor to create the app_errors table

CREATE TABLE IF NOT EXISTS public.app_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    error_message TEXT NOT NULL,
    source TEXT,
    line_number INTEGER,
    column_number INTEGER,
    error_stack TEXT,
    user_agent TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.app_errors ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated users to insert errors (so the client app can log them)
CREATE POLICY "Allow public insert to app_errors"
ON public.app_errors FOR INSERT
TO public
WITH CHECK (true);

-- Allow admins to view the errors
CREATE POLICY "Allow admin read app_errors"
ON public.app_errors FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Allow admins to update the errors (e.g., mark as resolved)
CREATE POLICY "Allow admin update app_errors"
ON public.app_errors FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);

-- Allow admins to delete the errors
CREATE POLICY "Allow admin delete app_errors"
ON public.app_errors FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
);
