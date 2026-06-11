-- =========================================================================
-- VELGO NIGERIA: BOOKINGS QUOTE BREAKDOWN SCHEMAS
-- =========================================================================
-- This script adds fields to the bookings table to allow workers to state
-- custom bidding quotes, preventing the "Invoicing Ambiguity" risk in Nigeria
-- where clients often confuse labor charges with total material costs.

-- 1. Add quote-related columns to the public.bookings table
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS quote_price NUMERIC DEFAULT NULL,
ADD COLUMN IF NOT EXISTS quote_covers_labor BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS quote_covers_materials BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quote_covers_transport BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quote_covers_other BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS quote_notes TEXT DEFAULT NULL;

-- 2. Add an optional comment for database clarity
COMMENT ON COLUMN public.bookings.quote_price IS 'The custom price bid or negotiated estimate provided by the artisan';
COMMENT ON COLUMN public.bookings.quote_covers_labor IS 'True if the bid estimate includes labor costs';
COMMENT ON COLUMN public.bookings.quote_covers_materials IS 'True if the bid estimate includes parts or material costs';
COMMENT ON COLUMN public.bookings.quote_covers_transport IS 'True if the bid estimate includes logistics, fuel, or transport';
COMMENT ON COLUMN public.bookings.quote_covers_other IS 'True if the bid estimate includes miscellaneous or other costs';
