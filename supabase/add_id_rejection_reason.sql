-- ==========================================
-- VELGO DATABASE MIGRATION: ADD REJECTION REASON COLUMN
-- ==========================================

-- This migrates the profiles table to include a feedback/rejection reason column
-- so admins can explain why validation attempts failed.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS id_rejection_reason TEXT;
