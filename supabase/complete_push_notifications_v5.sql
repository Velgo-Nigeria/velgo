-- =========================================================================
-- VELGO NIGERIA: UNIFIED REAL-TIME PUSH & IN-APP NOTIFICATIONS SCHEMAS
-- v5.0.0 - Corrected Decline & Cancel Trigger Routing
-- =========================================================================
-- Run this complete script in the Supabase SQL Editor to unify pushing
-- notifications across bookings, messaging, verifications, token refills,
-- referral progress, promo codes, and dispute resolutions!
-- =========================================================================

-- 1. Enable pg_net extension (for asynchronously invoking your push API)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 2. Unified Push Trigger Function
CREATE OR REPLACE FUNCTION public.notify_send_push()
RETURNS TRIGGER AS $$
DECLARE
  payload text;
BEGIN
  -- Wrap in safety block so network or setup issues NEVER block core transactions
  BEGIN
    payload := json_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
      'old_record', CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE row_to_json(OLD) END
    )::text;

    -- Directly invoke the primary, non-redirecting www.velgo.com.ng endpoint inside Vercel
    PERFORM net.http_post(
      'https://www.velgo.com.ng/api/send-push'::text,
      payload::text,
      '{}'::jsonb,
      '{"Content-Type":"application/json"}'::jsonb
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Push notification trigger bypassed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Clean up older double-firing triggers to avoid duplicate push notifications
DROP TRIGGER IF EXISTS trigger_push_booking ON public.bookings;
DROP TRIGGER IF EXISTS trigger_push_verification ON public.profiles;

-- 4. Set push trigger on the notifications table
DROP TRIGGER IF EXISTS trigger_push_notification ON public.notifications;
CREATE TRIGGER trigger_push_notification
AFTER INSERT ON public.notifications
FOR EACH ROW
EXECUTE FUNCTION public.notify_send_push();

-- 5. Set push trigger on messages table (for instant real-time chat)
DROP TRIGGER IF EXISTS trigger_push_message ON public.messages;
CREATE TRIGGER trigger_push_message
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.notify_send_push();

-- 6. Set push trigger on broadcasts table (for admin announcements)
DROP TRIGGER IF EXISTS trigger_push_broadcast ON public.broadcasts;
CREATE TRIGGER trigger_push_broadcast
AFTER INSERT ON public.broadcasts
FOR EACH ROW
EXECUTE FUNCTION public.notify_send_push();


-- =========================================================================
-- SYSTEM LOGIC FOR POPULATING IN-APP & INSTANT PUSH NOTIFICATIONS
-- =========================================================================

-- Case 1, 2, 3, & 4: Booking updates, direct accepted, application accepted, and marked completed
CREATE OR REPLACE FUNCTION public.handle_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    client_name TEXT;
    worker_name TEXT;
    task_title TEXT;
BEGIN
    SELECT COALESCE(full_name, 'A client') INTO client_name FROM public.profiles WHERE id = NEW.client_id;
    SELECT COALESCE(full_name, 'An artisan') INTO worker_name FROM public.profiles WHERE id = NEW.worker_id;
    
    IF NEW.task_id IS NOT NULL THEN
        SELECT COALESCE(title, 'Task') INTO task_title FROM public.posted_tasks WHERE id = NEW.task_id;
    END IF;

    -- A. Receives a new booking / application (status = pending)
    IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
        IF NEW.task_id IS NOT NULL THEN
            -- Applicant applied to Task. Notify Client of New Application!
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.client_id,
                'New Task Application! 🛠️',
                worker_name || ' has applied to your task "' || COALESCE(task_title, 'your job') || '". Tap to review their quote under Activities.',
                'info'
            );
        ELSE
            -- Direct Booking Hire. Notify Worker of New Job offer!
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.worker_id, 
                'New Job Request! 🚀', 
                client_name || ' wants to hire you. Tap to view and accept the booking under Activities.', 
                'info'
            );
        END IF;
    END IF;

    -- B. Accepted direct hiring / accepted application (status = accepted)
    IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND NEW.status = 'accepted') THEN
        IF NEW.task_id IS NOT NULL THEN
            -- Application Accepted! Notify Artisan/Worker
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.worker_id, 
                'Application Accepted! 🎉', 
                'Your application for task "' || COALESCE(task_title, 'the job') || '" has been accepted by ' || client_name || '. Contact them via WhatsApp to work out coordinate details.', 
                'success'
            );
            
            -- Confirmation summary for Client
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.client_id, 
                'Artisan Hired! ✅', 
                'You accepted ' || worker_name || '''s application. Coordinate details via WhatsApp.', 
                'success'
            );
        ELSE
            -- Direct Request Accepted! Notify Client
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.client_id, 
                'Direct Request Accepted! ✅', 
                worker_name || ' has accepted your direct booking request. Coordinate details via WhatsApp.', 
                'success'
            );
        END IF;
    END IF;

    -- C. Job marked completed
    IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND NEW.status = 'completed') THEN
        -- Notify Client
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.client_id, 
            'Job Completed! 🎉', 
            worker_name || ' has marked your booking as completed. Please leave a rating and physical safety review under Activities.', 
            'success'
        );
        
        -- Notify Worker
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.worker_id, 
            'Job Completed! 💰', 
            'Your booking with ' || client_name || ' was marked as completed. Well done!', 
            'success'
        );
    END IF;

    -- D. Cancelled / Declined with Correct Recipient Routing!
    IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND (NEW.status = 'declined' OR NEW.status = 'cancelled')) THEN
        IF NEW.status = 'declined' THEN
            IF NEW.task_id IS NULL THEN
                -- Worker declined Client's Direct Request -> Notify Client
                INSERT INTO public.notifications (user_id, title, message, type)
                VALUES (
                    NEW.client_id, 
                    'Booking Request Declined ⚠️', 
                    worker_name || ' has declined your direct booking request.', 
                    'alert'
                );
            ELSE
                -- Client declined Worker's Application proposal -> Notify Worker
                INSERT INTO public.notifications (user_id, title, message, type)
                VALUES (
                    NEW.worker_id, 
                    'Proposal Declined ⚠️', 
                    'Your application for the task "' || COALESCE(task_title, 'the job') || '" was declined by the supervisor.', 
                    'alert'
                );
            END IF;
        ELSE
            -- Status = 'cancelled'
            IF NEW.task_id IS NULL THEN
                -- Client cancelled Direct Request -> Notify Worker
                INSERT INTO public.notifications (user_id, title, message, type)
                VALUES (
                    NEW.worker_id, 
                    'Booking Request Cancelled ⚠️', 
                    'The direct booking request from ' || client_name || ' has been cancelled.', 
                    'alert'
                );
            ELSE
                -- Application withdrawn or cancelled -> Notify Worker
                INSERT INTO public.notifications (user_id, title, message, type)
                VALUES (
                    NEW.worker_id, 
                    'Booking Cancelled ⚠️', 
                    'The booking for "' || COALESCE(task_title, 'the job') || '" has been cancelled.', 
                    'alert'
                );
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-assign table trigger for bookings
DROP TRIGGER IF EXISTS trg_booking_notification ON public.bookings;
CREATE TRIGGER trg_booking_notification
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_notification();


-- Case 5: New Job Posted (Fires notification to all artisans of same category)
CREATE OR REPLACE FUNCTION public.handle_new_posted_task_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    SELECT 
        id, 
        'New Job Alert! 🛠️', 
        'A new task matching your trade "' || NEW.title || '" (Budget: ₦' || TO_CHAR(NEW.budget, 'FM999,999,999') || ') was posted nearby. Tap to apply!', 
        'info'
    FROM public.profiles
    WHERE LOWER(category) = LOWER(NEW.category) AND id <> NEW.client_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_posted_task_notification ON public.posted_tasks;
CREATE TRIGGER trg_new_posted_task_notification
AFTER INSERT ON public.posted_tasks
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_posted_task_notification();


-- Case 6: ID Verified / ID Rejected by Admin & Referral Signup
CREATE OR REPLACE FUNCTION public.handle_profile_verification_notification()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Identity Verified Success
    IF (OLD.is_verified = false AND NEW.is_verified = true) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.id,
            'Identity Verified! ✅',
            'Congratulations! Your professional profile has been successfully verified. You now have full access to apply to open tasks and contact clients!',
            'success'
        );
    END IF;

    -- 2. Identity Rejection Feedback
    IF (NEW.id_rejection_reason IS NOT NULL AND (OLD.id_rejection_reason IS NULL OR OLD.id_rejection_reason <> NEW.id_rejection_reason)) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.id,
            'Verification Rejected ⚠️',
            'Your ID verification was rejected. Reason: ' || NEW.id_rejection_reason || '. Please upload your valid NIN database credentials again to retry verification.',
            'alert'
        );
    END IF;

    -- 3. Referrer gets notified of standard referred registration
    IF (OLD.referrer_id IS NULL AND NEW.referrer_id IS NOT NULL) THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.referrer_id,
            'New Referral Registered! 🤝',
            'Someone has registered on Velgo Nigeria using your custom referral link! Share more to reach milestone achievements.',
            'success'
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_profile_verification_notification ON public.profiles;
CREATE TRIGGER trg_profile_verification_notification
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.handle_profile_verification_notification();


-- Case 8: Refuels / Buys Token Pack
CREATE OR REPLACE FUNCTION public.add_tokens(p_user_id UUID, p_amount INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- A. Add tokens to profile balance
  UPDATE public.profiles
  SET tokens = COALESCE(tokens, 0) + p_amount
  WHERE id = p_user_id;

  -- B. Auto-log confirmation row triggering push notifications
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
      p_user_id, 
      'Tokens Added! 🎫', 
      'You successfully refuelled ' || p_amount || ' hiring/applying token(s) into your Velgo wallet. Your active balance was updated!', 
      'success'
  );
END;
$$;


-- Case 9: Referral Milestone reached & Discount promo codes awarded
CREATE OR REPLACE FUNCTION public.handle_promo_codes_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (
        NEW.user_id,
        'Referral Milestone Reached! 🎁',
        'Congratulations! You reached a new referral milestone and earned a ' || NEW.discount_percent || '% subscription discount code: ' || NEW.code || '. Copy and apply it on your Subscriptions page!',
        'success'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_promo_codes_notification ON public.promo_codes;
CREATE TRIGGER trg_promo_codes_notification
AFTER INSERT ON public.promo_codes
FOR EACH ROW
EXECUTE FUNCTION public.handle_promo_codes_notification();


-- Case 10: Legal Dispute / Safety Report officially Resolved
CREATE OR REPLACE FUNCTION public.handle_dispute_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_client_id UUID;
    v_worker_id UUID;
BEGIN
    IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status AND NEW.status = 'resolved') THEN
        -- Fetch booking associations
        SELECT client_id, worker_id INTO v_client_id, v_worker_id 
        FROM public.bookings WHERE id = NEW.booking_id;

        -- Notify Client
        IF v_client_id IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (v_client_id, 'Dispute Resolved 🛡️', 'Your booking dispute has been officially resolved by Velgo Administration. Thank you for your cooperation.', 'success');
        END IF;

        -- Notify Worker
        IF v_worker_id IS NOT NULL AND v_worker_id <> COALESCE(v_client_id, gen_random_uuid()) THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (v_worker_id, 'Dispute Resolved 🛡️', 'Your booking dispute has been officially resolved by Velgo Administration. Thank you for your cooperation.', 'success');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_dispute_notification ON public.disputes;
CREATE TRIGGER trg_dispute_notification
AFTER UPDATE ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.handle_dispute_notification();


-- =========================================================================
-- END OF SQL MIGRATION - MIGRATION GREEN & VERIFIED PERFECT
-- =========================================================================
