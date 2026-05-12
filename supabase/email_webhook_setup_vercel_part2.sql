-- Add webhooks for additional email notifications

-- 1. Trigger for Profiles (ID Verification Status Update)
DROP TRIGGER IF EXISTS trigger_send_profile_email ON profiles;
CREATE TRIGGER trigger_send_profile_email
AFTER UPDATE OF is_verified ON profiles
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);

-- 2. Trigger for Task Update
DROP TRIGGER IF EXISTS trigger_send_task_email ON posted_tasks;
CREATE TRIGGER trigger_send_task_email
AFTER UPDATE OF status ON posted_tasks
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);

-- 3. Trigger for Admin Broadcasts
DROP TRIGGER IF EXISTS trigger_send_broadcast_email ON broadcasts;
CREATE TRIGGER trigger_send_broadcast_email
AFTER INSERT ON broadcasts
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);

-- 4. Review Requests Table and Trigger (Optional: Use this if you want to explicitly request reviews)
CREATE TABLE IF NOT EXISTS review_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trigger_send_review_request_email ON review_requests;
CREATE TRIGGER trigger_send_review_request_email
AFTER INSERT ON review_requests
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);
