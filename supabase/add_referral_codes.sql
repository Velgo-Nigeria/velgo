-- ==========================================
-- VELGO V2: Add Referral Code Column and Generate
-- ==========================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;

CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TRIGGER AS $$
DECLARE
    new_code TEXT;
    done BOOLEAN;
BEGIN
    done := false;
    WHILE NOT done LOOP
        new_code := 'VGO-' || upper(substring(md5(random()::text) from 1 for 6));
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) THEN
            done := true;
        END IF;
    END LOOP;
    NEW.referral_code := new_code;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_referral_code_trigger ON public.profiles;

CREATE TRIGGER set_referral_code_trigger
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION generate_referral_code();

-- Generate codes for existing profiles
DO $$
DECLARE
    row_record RECORD;
    new_code TEXT;
    done BOOLEAN;
BEGIN
    FOR row_record IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
        done := false;
        WHILE NOT done LOOP
            new_code := 'VGO-' || upper(substring(md5(random()::text) from 1 for 6));
            IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code) THEN
                UPDATE public.profiles SET referral_code = new_code WHERE id = row_record.id;
                done := true;
            END IF;
        END LOOP;
    END LOOP;
END;
$$;
