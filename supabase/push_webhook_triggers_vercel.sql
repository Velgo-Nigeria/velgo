-- ========================================================
-- VELGO DATABASE MIGRATION: VERCEL PUSH WEBHOOKS (NATIVE PG_NET)
-- ========================================================

-- This script sets up triggers using Supabase's native pg_net extension to invoke
-- your Vercel URL asynchronously of database change events! 
-- This is identical to creating the webhooks through the Supabase Dashboard UI,
-- but running this single SQL script does it all in 1 click!

-- 1. Ensure pg_net extension is enabled (Required for Webhooks)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 2. Create the unified Trigger Function using pg_net (net.http_post)
CREATE OR REPLACE FUNCTION public.notify_send_push()
RETURNS TRIGGER AS $$
DECLARE
  payload text;
BEGIN
  -- We wrap the push initiation inside a safety sub-block so any network
  -- or extension errors never block the parent booking/message/verification transaction!
  BEGIN
    -- Construct standard Supabase webhook payload structure
    payload := json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
      'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END
    )::text;

    -- Invoke the HTTP POST request asynchronously via net.http_post
    -- We use cased positional parameters to guarantee compatibility across pg_net versions
    PERFORM net.http_post(
      'https://velgo.com.ng/api/send-push'::text,
      payload::text,
      '{}'::jsonb,
      '{"Content-Type":"application/json"}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    -- Safely swallow errors so database inserts/updates always succeed
    RAISE WARNING 'Push notification trigger bypassed due to error: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Trigger for Bookings (New Job Requests & Status Changes)
DROP TRIGGER IF EXISTS trigger_push_booking ON bookings;
CREATE TRIGGER trigger_push_booking
AFTER INSERT OR UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION public.notify_send_push();

-- 4. Trigger for Messages (New Chat Messages)
DROP TRIGGER IF EXISTS trigger_push_message ON messages;
CREATE TRIGGER trigger_push_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_send_push();

-- 5. Trigger for Admin Broadcasts (Global Announcements)
DROP TRIGGER IF EXISTS trigger_push_broadcast ON broadcasts;
CREATE TRIGGER trigger_push_broadcast
AFTER INSERT ON broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.notify_send_push();

-- 6. Trigger for ID Verification (Professional Identity Verification Status)
DROP TRIGGER IF EXISTS trigger_push_verification ON profiles;
CREATE TRIGGER trigger_push_verification
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION public.notify_send_push();
