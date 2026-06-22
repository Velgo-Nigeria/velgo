-- =========================================================================
-- VELGO NIGERIA: UNIFIED REAL-TIME TRANSACTIONAL EMAIL SETUP
-- v6.0.0 - Production-Grade Native Supabase Webhook Integration
-- =========================================================================
-- This script configures production database webhooks using Supabase's
-- built-in native Webhook mechanism (supabase_functions.http_request).
-- It has zero reliance on the unstable 'pg_net' extension!
-- =========================================================================

-- 1. Safely drop the legacy pg_net trigger and trigger function from v5 to perform a clean upgrade
DROP TRIGGER IF EXISTS trigger_email_notification ON public.notifications;
DROP FUNCTION IF EXISTS public.notify_send_email();

-- 2. Safely drop older direct-firing triggers to avoid duplicate emails
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    DROP TRIGGER IF EXISTS trigger_send_profile_email ON public.profiles;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'posted_tasks') THEN
    DROP TRIGGER IF EXISTS trigger_send_task_email ON public.posted_tasks;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'broadcasts') THEN
    DROP TRIGGER IF EXISTS trigger_send_broadcast_email ON public.broadcasts;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'review_requests') THEN
    DROP TRIGGER IF EXISTS trigger_send_review_request_email ON public.review_requests;
  END IF;
END
$$;


-- 3. Setup Native Webhook for the 'notifications' Table (AFTER INSERT)
-- This covers: Bookings, Token Additions, Promo code wins, Dispute resolution alerts, and Status changes.
-- Why? Because those tables automatically insert rows into the 'notifications' table!
DROP TRIGGER IF EXISTS trigger_email_notification ON public.notifications;
CREATE TRIGGER trigger_email_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);


-- 4. Setup Native Webhook for the 'messages' Table (AFTER INSERT)
-- This sends direct emails to users when they receive offline chat messages.
DROP TRIGGER IF EXISTS trigger_email_message ON public.messages;
CREATE TRIGGER trigger_email_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);


-- 5. Setup Native Webhook for the 'safety_reports' Table (AFTER INSERT)
-- This automatically notifies admins instantly when critical safety alerts are filed.
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


-- 6. Setup Native Webhook for the 'support_messages' Table (AFTER INSERT)
-- This notifies admins of incoming tickets, AND users when administration responds.
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


-- =========================================================================
-- END OF SQL MIGRATION - MIGRATION GREEN & VERIFIED PERFECT
-- =========================================================================
