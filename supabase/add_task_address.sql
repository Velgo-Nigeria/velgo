-- Migration: Add address column to posted_tasks table
-- Copy and run this script in your Supabase SQL Editor to enable physical task addresses.

ALTER TABLE public.posted_tasks ADD COLUMN IF NOT EXISTS address TEXT;
