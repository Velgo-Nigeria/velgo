-- SQL Migration: Add evidence_url column to safety_reports table
ALTER TABLE public.safety_reports
ADD COLUMN IF NOT EXISTS evidence_url text;

-- Add comment to explain usage
COMMENT ON COLUMN public.safety_reports.evidence_url IS 'Public storage URL of attached screenshot/log files for admin review.';
