-- ====================================================================
-- VELGO DATABASE MIGRATION: IMPLEMENT DIFFERENTIATED TOKEN EXHAUSTION ERRORS
-- ====================================================================

-- 1. Create or replace accept_booking_with_mutual_deduction
CREATE OR REPLACE FUNCTION public.accept_booking_with_mutual_deduction(p_booking_id UUID, p_accepter_id UUID)
RETURNS boolean AS $$
DECLARE
    v_client_id UUID;
    v_worker_id UUID;
    v_client_tokens INTEGER;
    v_worker_tokens INTEGER;
    v_booking_status public.booking_status;
BEGIN
    -- 1. Get booking details
    SELECT client_id, worker_id, status 
    INTO v_client_id, v_worker_id, v_booking_status
    FROM public.bookings
    WHERE id = p_booking_id;
    
    IF v_booking_status != 'pending' THEN
        RAISE EXCEPTION 'Booking is not pending.';
    END IF;

    -- 2. Verify accepter is part of the booking
    IF p_accepter_id != v_client_id AND p_accepter_id != v_worker_id THEN
        RAISE EXCEPTION 'Unauthorized: Accepter is not part of this booking.';
    END IF;

    -- 3. Check tokens for BOTH
    SELECT tokens INTO v_client_tokens FROM public.profiles WHERE id = v_client_id;
    SELECT tokens INTO v_worker_tokens FROM public.profiles WHERE id = v_worker_id;

    -- Differentiate Token Exhaustion Exception Reporting
    IF v_client_tokens < 1 THEN
        RAISE EXCEPTION 'INSUFFICIENT_TOKENS_CLIENT';
    END IF;
    
    IF v_worker_tokens < 1 THEN
        RAISE EXCEPTION 'INSUFFICIENT_TOKENS_WORKER';
    END IF;

    -- 4. Deduct tokens
    UPDATE public.profiles SET tokens = tokens - 1 WHERE id = v_client_id;
    UPDATE public.profiles SET tokens = tokens - 1 WHERE id = v_worker_id;

    -- 5. Update booking status
    UPDATE public.bookings SET status = 'accepted', updated_at = NOW() WHERE id = p_booking_id;

    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Create or replace accept_booking_with_token (RPC name used in frontend pages/Activity.tsx)
CREATE OR REPLACE FUNCTION public.accept_booking_with_token(p_booking_id UUID, p_user_id UUID)
RETURNS boolean AS $$
BEGIN
    -- Directly proxy to the mutual deduction function to align business rules
    RETURN public.accept_booking_with_mutual_deduction(p_booking_id, p_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
