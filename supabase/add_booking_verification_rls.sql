-- Security Hardening: Ensure that only verified users can create bookings
-- Either as a client booking an artisan directly, or as an artisan applying to a posted job.

-- 1. Drop the old insertion policy
DROP POLICY IF EXISTS "Bookings insertable by involved users" ON public.bookings;

-- 2. Create the hardened policy requiring is_verified = true for the inserter
CREATE POLICY "Bookings insertable by involved users" ON public.bookings
FOR INSERT WITH CHECK (
    (auth.uid() = client_id OR auth.uid() = worker_id)
    AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND is_verified = true
    )
);
