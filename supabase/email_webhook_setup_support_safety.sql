-- ========================================================
-- VELGO DATABASE COMPREHENSIVE MIGRATION: SUPPORT & SAFETY TRIGGERS
-- ========================================================

-- This migration establishes automatic Supabase HTTP triggers to execute the 
-- Resend email sender API proxy whenever safety reports (urgent) or support
-- messages (incoming customer help) are saved.

-- 1. Trigger for Safety Reports
DROP TRIGGER IF EXISTS trigger_send_safety_report_email ON public.safety_reports;
CREATE TRIGGER trigger_send_safety_report_email
AFTER INSERT ON public.safety_reports
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);

-- 2. Trigger for Support Messages
DROP TRIGGER IF EXISTS trigger_send_support_message_email ON public.support_messages;
CREATE TRIGGER trigger_send_support_message_email
AFTER INSERT ON public.support_messages
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);

-- Note: Ensure that the 'supabase_functions' extension is active and 
-- enabled in your Supabase DB extensions.
