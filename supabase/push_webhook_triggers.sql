-- ========================================================
-- VELGO DATABASE COMPREHENSIVE MIGRATION: PUSH WEBHOOKS
-- ========================================================

-- This migration sets up real-time HTTP triggers to invoke the 'push'
-- edge function automatically upon specific database operations.

-- 1. Trigger for Bookings (New & Updated)
DROP TRIGGER IF EXISTS trigger_push_booking ON bookings;
CREATE TRIGGER trigger_push_booking
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/functions/v1/push',
  'POST',
  '{"Content-Type":"application/json", "Authorization":"Bearer [YOUR_ANON_KEY]"}',
  '{}',
  '2000'
);

-- 2. Trigger for Messages (New)
DROP TRIGGER IF EXISTS trigger_push_message ON messages;
CREATE TRIGGER trigger_push_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/functions/v1/push',
  'POST',
  '{"Content-Type":"application/json", "Authorization":"Bearer [YOUR_ANON_KEY]"}',
  '{}',
  '2000'
);

-- 3. Trigger for Admin Broadcasts (New)
DROP TRIGGER IF EXISTS trigger_push_broadcast ON broadcasts;
CREATE TRIGGER trigger_push_broadcast
AFTER INSERT ON broadcasts
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/functions/v1/push',
  'POST',
  '{"Content-Type":"application/json", "Authorization":"Bearer [YOUR_ANON_KEY]"}',
  '{}',
  '2000'
);
