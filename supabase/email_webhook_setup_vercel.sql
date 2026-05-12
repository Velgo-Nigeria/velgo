-- Set up Webhooks to call our Vercel Serverless Function

-- 1. Trigger for Bookings (New & Updated)
DROP TRIGGER IF EXISTS trigger_send_booking_email ON bookings;
CREATE TRIGGER trigger_send_booking_email
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);

-- 2. Trigger for Messages (New)
DROP TRIGGER IF EXISTS trigger_send_message_email ON messages;
CREATE TRIGGER trigger_send_message_email
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);
