-- =========================================================================
-- VELGO V2: ARTISAN REVIEW REPLY & MODERATION SYSTEM
-- =========================================================================

-- 1. Add columns to bookings for worker reply
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS worker_reply TEXT,
ADD COLUMN IF NOT EXISTS worker_reply_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS worker_reply_approved BOOLEAN DEFAULT FALSE;

-- 2. Add validation constraint to enforce 200 character cap in database (optional but safe)
ALTER TABLE public.bookings
DROP CONSTRAINT IF EXISTS worker_reply_length_check,
ADD CONSTRAINT worker_reply_length_check CHECK (char_length(worker_reply) <= 200);

-- Enable RLS updates for worker_reply
-- Check if workers can update their own bookings
-- Since they can update status or other details, we make sure they can update the review reply too.
