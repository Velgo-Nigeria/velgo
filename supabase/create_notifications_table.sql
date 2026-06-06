-- =========================================================================
-- VELGO DATABASE-BACKED NOTIFICATIONS SETUP
-- Run this script in your Supabase SQL Editor to provision the
-- notifications table, automated triggers, and 7-day cleanup rules.
-- =========================================================================

-- 1. Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info' CHECK(type IN ('info', 'success', 'alert')),
    is_read BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 3. Drop existing policies if they exist to prevent duplicates
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;

-- 4. Create secure RLS policies
CREATE POLICY "Users can view their own notifications" ON public.notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" ON public.notifications
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" ON public.notifications
    FOR DELETE USING (auth.uid() = user_id);

-- 5. Automatically prune notifications older than 7 days
CREATE OR REPLACE FUNCTION public.prune_old_notifications()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.notifications 
    WHERE created_at < NOW() - INTERVAL '7 days';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run cleanup automatically on insertion
DROP TRIGGER IF EXISTS trg_prune_old_notifications ON public.notifications;
CREATE TRIGGER trg_prune_old_notifications
AFTER INSERT ON public.notifications
FOR EACH STATEMENT
EXECUTE FUNCTION public.prune_old_notifications();

-- 6. Automated triggers for Bookings (New Request, Acceptance, Completion)
CREATE OR REPLACE FUNCTION public.handle_booking_notification()
RETURNS TRIGGER AS $$
DECLARE
    client_name TEXT;
    worker_name TEXT;
BEGIN
    -- Get involved user names safely
    SELECT COALESCE(full_name, 'A client') INTO client_name FROM public.profiles WHERE id = NEW.client_id;
    SELECT COALESCE(full_name, 'An artisan') INTO worker_name FROM public.profiles WHERE id = NEW.worker_id;

    -- CASE 1: New Booking request (Notify Worker)
    IF (TG_OP = 'INSERT' AND NEW.status = 'pending') THEN
        INSERT INTO public.notifications (user_id, title, message, type)
        VALUES (
            NEW.worker_id, 
            'New Job Request! 🚀', 
            client_name || ' wants to hire you. Tap to view and accept the booking under Activities.', 
            'info'
        );
    END IF;

    -- CASE 2: Booking status updates
    IF (TG_OP = 'UPDATE' AND OLD.status <> NEW.status) THEN
        -- Accepted
        IF (NEW.status = 'accepted') THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.client_id, 
                'Job Accepted! ✅', 
                worker_name || ' has accepted your request. Navigate to Activities to contact them via WhatsApp.', 
                'success'
            );
        -- Completed
        ELSIF (NEW.status = 'completed') THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.client_id, 
                'Job Completed! 🎉', 
                worker_name || ' has marked your booking as completed. Please leave a rating and physical safety review under Activities.', 
                'success'
            );
            
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                NEW.worker_id, 
                'Job Completed! 💰', 
                'Your booking with ' || client_name || ' was marked as completed. Well done!', 
                'success'
            );
        -- Cancelled / Declined
        ELSIF (NEW.status = 'declined' OR NEW.status = 'cancelled') THEN
            INSERT INTO public.notifications (user_id, title, message, type)
            VALUES (
                CASE WHEN NEW.status = 'declined' THEN NEW.client_id ELSE NEW.worker_id END, 
                'Booking Update ⚠️', 
                'Your booking request was ' || NEW.status || '.', 
                'alert'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_booking_notification ON public.bookings;
CREATE TRIGGER trg_booking_notification
AFTER INSERT OR UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_notification();


