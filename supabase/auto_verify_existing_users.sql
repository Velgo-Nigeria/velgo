-- Run this in your Supabase SQL Editor if you are turning on 'Confirm Email'
-- This will auto-verify all existing users so they don't get locked out.

UPDATE auth.users 
SET email_confirmed_at = NOW() 
WHERE email_confirmed_at IS NULL;
