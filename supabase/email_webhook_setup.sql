-- Set up the webhook to call our new 'send-email' edge function

-- 1. Trigger for Bookings (New & Updated)
DROP TRIGGER IF EXISTS trigger_send_booking_email ON bookings;
CREATE TRIGGER trigger_send_booking_email
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/functions/v1/send-email',
  'POST',
  '{"Content-Type":"application/json", "Authorization":"Bearer [YOUR_ANON_KEY]"}',
  '{}',
  '2000'
);

-- 2. Trigger for Messages (New)
DROP TRIGGER IF EXISTS trigger_send_message_email ON messages;
CREATE TRIGGER trigger_send_message_email
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/functions/v1/send-email',
  'POST',
  '{"Content-Type":"application/json", "Authorization":"Bearer [YOUR_ANON_KEY]"}',
  '{}',
  '2000'
);

-- 3. Trigger for Admin Broadcasts (Optional - handled by push mostly, but added for completeness)
DROP TRIGGER IF EXISTS trigger_send_broadcast_email ON broadcasts;
CREATE TRIGGER trigger_send_broadcast_email
AFTER INSERT ON broadcasts
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://[YOUR_SUPABASE_PROJECT_REF].supabase.co/functions/v1/send-email',
  'POST',
  '{"Content-Type":"application/json", "Authorization":"Bearer [YOUR_ANON_KEY]"}',
  '{}',
  '2000'
);
