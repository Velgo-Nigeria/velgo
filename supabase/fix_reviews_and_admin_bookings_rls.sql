-- ====================================================================
-- VELGO DATABASE MIGRATION: FIX BOOKINGS/REVIEWS RLS POLICIES FOR ADMIN & VISITORS
-- ====================================================================

-- 1. Create a policy letting Admins do everything on Bookings
DROP POLICY IF EXISTS "Admins have full access to bookings" ON public.bookings;
CREATE POLICY "Admins have full access to bookings" ON public.bookings
FOR ALL TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 2. Create a policy letting everyone SELECT bookings that contain an actual review/rating
-- This allows visitors to see reviews and approved replies, but keeps unreviewed bookings private.
DROP POLICY IF EXISTS "Reviews and replies are publicly viewable" ON public.bookings;
CREATE POLICY "Reviews and replies are publicly viewable" ON public.bookings
FOR SELECT TO authenticated
USING (review IS NOT NULL OR rating IS NOT NULL);
