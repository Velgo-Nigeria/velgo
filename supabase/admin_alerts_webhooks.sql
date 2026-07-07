-- =========================================================================
-- VELGO NIGERIA: ADMIN ALERTS (ID VERIFICATION & ARTISAN REPLY)
-- =========================================================================

-- 1. Webhook for ID Verification Uploads (profiles table)
DROP TRIGGER IF EXISTS trigger_email_profile_update ON public.profiles;
CREATE TRIGGER trigger_email_profile_update
AFTER UPDATE OF nin_image_url ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);

-- 2. Webhook for Artisan Reply Submissions (bookings table)
DROP TRIGGER IF EXISTS trigger_email_bookings_update ON public.bookings;
CREATE TRIGGER trigger_email_bookings_update
AFTER UPDATE OF worker_reply ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION supabase_functions.http_request(
  'https://velgo.com.ng/api/send-email',
  'POST',
  '{"Content-Type":"application/json"}',
  '{}',
  '2000'
);

-- =========================================================================
