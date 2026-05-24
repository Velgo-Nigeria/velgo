-- ========================================================
-- VELGO DATABASE MIGRATION: VERCEL PUSH WEBHOOKS
-- ========================================================

-- This script sets up triggers that invoke your Vercel URL
-- whenever messages, bookings, or broadcasts are created or updated.

-- NOTE: Replace 'https://velgo.com.ng' below with your actual Vercel domain!
-- You do NOT need any authorization token for this endpoint since it handles public webhooks with internally secure Supabase tokens.

-- 1. Trigger for Bookings (New Job Requests & Status Changes)
DROP TRIGGER IF EXISTS trigger_push_booking ON bookings;
CREATE TRIGGER trigger_push_booking
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-push',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);

-- 2. Trigger for Messages (New Chat Messages)
DROP TRIGGER IF EXISTS trigger_push_message ON messages;
CREATE TRIGGER trigger_push_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-push',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);

-- 3. Trigger for Admin Broadcasts (To All Subscribed Users)
DROP TRIGGER IF EXISTS trigger_push_broadcast ON broadcasts;
CREATE TRIGGER trigger_push_broadcast
AFTER INSERT ON broadcasts
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-push',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);

-- 4. Trigger for ID Verification (Professional Identity Verification Status)
DROP TRIGGER IF EXISTS trigger_push_verification ON profiles;
CREATE TRIGGER trigger_push_verification
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-push',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);
