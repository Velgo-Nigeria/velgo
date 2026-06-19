-- =========================================================================
-- VELGO DATABASE MIGRATION: RECTIFY SUPPORT DESK SCHEMA & RLS LOCK
-- Run this script in your Supabase SQL Editor (https://supabase.com)
-- to add required support channels and unlock admin ticket replying.
-- =========================================================================

-- 1. Safely append missing support columns with check guards
ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS admin_reply BOOLEAN DEFAULT false;

ALTER TABLE public.support_messages 
ADD COLUMN IF NOT EXISTS content TEXT;

-- 2. Drop legacy security locks on support_messages
DROP POLICY IF EXISTS "Users can insert support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Users can view own support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins can view all support messages" ON public.support_messages;
DROP POLICY IF EXISTS "Admins can insert support replies" ON public.support_messages;

-- 3. Provision new omni-channel policies for Support Desk
-- Allow clients to read their own messages, and Admins (role = 'admin' or matching official mail) to read EVERYTHING
CREATE POLICY "Admins can view all support messages" ON public.support_messages
FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR email = 'admin.velgo@gmail.com' OR email = 'velgonigeria.uni@gmail.com')
  )
);

-- Allow users to insert their own issues, and Admins to submit ticket replies globally
CREATE POLICY "Admins can insert support replies" ON public.support_messages
FOR INSERT WITH CHECK (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND (role = 'admin' OR email = 'admin.velgo@gmail.com' OR email = 'velgonigeria.uni@gmail.com')
  )
);

-- 4. Double check RLS policy exists for the public.notifications insertion
DROP POLICY IF EXISTS "Allow authed custom inserts on notifications" ON public.notifications;
CREATE POLICY "Allow authed custom inserts on notifications" ON public.notifications
FOR INSERT WITH CHECK (true);
