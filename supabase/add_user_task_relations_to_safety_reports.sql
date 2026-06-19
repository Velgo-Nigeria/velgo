-- =========================================================================
-- VELGO DATABASE MIGRATION: EXTEND SAFETY SUB-SYSTEM FOR USER & TASK REPORTING
-- Run this script in your Supabase SQL Editor (https://supabase.com)
-- to easily flag fraudulent tasks, abusive clients, or bad-actor workers. 
-- =========================================================================

-- 1. Extend safety_reports with target user, task, and booking relations
ALTER TABLE public.safety_reports 
ADD COLUMN IF NOT EXISTS reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_task_id UUID REFERENCES public.posted_tasks(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS related_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL;

-- 2. Add helpful explanatory comments for internal clarity
COMMENT ON COLUMN public.safety_reports.reported_user_id IS 'UUID of the worker or client being reported/flagged.';
COMMENT ON COLUMN public.safety_reports.related_task_id IS 'UUID of the fraudulent task or gig being flagged.';
COMMENT ON COLUMN public.safety_reports.related_booking_id IS 'UUID of any active dispute/completed transaction booking linking the two users.';
