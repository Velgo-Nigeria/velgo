-- ========================================================
-- VELGO DATABASE COMPREHENSIVE MIGRATION: PROMOTE ADMIN
-- ========================================================

-- This script elevates the user 'admin.velgo@gmail.com' (ID: 8fd40e7b-bfc1-4d5b-bd50-4cf18f8e945b)
-- to are database 'admin' role, enabling them to bypass Row-Level Security 
-- restrictions for broadcasts and announcements.

-- 1. Elevate profile role to 'admin' in profiles table
UPDATE public.profiles 
SET role = 'admin'::user_role 
WHERE id = '8fd40e7b-bfc1-4d5b-bd50-4cf18f8e945b' 
   OR email = 'admin.velgo@gmail.com';

-- 2. Confirm the update is active
SELECT id, email, role FROM public.profiles 
WHERE email = 'admin.velgo@gmail.com';
