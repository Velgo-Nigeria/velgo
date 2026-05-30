-- ====================================================================
-- VELGO DATABASE MIGRATION: ADD BLOCKING COLUMNS FOR EMERGENCY SUSPENSION
-- ====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS block_reason TEXT;

-- Re-enable RLS policy check helper so we can verify if admin updates are robust
-- This script does not conflict with existing policies.
