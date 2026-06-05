-- SQL Migration: Automated Rolling Purges for High-Scale Profile Views

-- 1. Create a dedicated security-defined function to safely prune rows older than 30 days.
-- Since the incremental metrics are already fully synced and stored in profiles.views_count,
-- clearing these detailed rows will NOT affect the visible numbers shown on profile screens.
CREATE OR REPLACE FUNCTION public.purge_old_profile_views()
RETURNS void AS $$
BEGIN
    DELETE FROM public.profile_views
    WHERE viewed_at < timezone('utc'::text, now()) - interval '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Safely attempt to initialize the pg_cron scheduler.
-- We use a dynamic SQL block to prevent hard syntax failures if the "cron" schema is missing.
DO $$
BEGIN
    -- A. Attempt to enable the extension if permitted
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not set up pg_cron automatically. If needed, please enable pg_cron in Database -> Extensions inside your dashboard.';
    END;

    -- B. Verify if the "cron" schema is now present after checking
    IF EXISTS (
        SELECT 1 
        FROM pg_namespace 
        WHERE nspname = 'cron'
    ) THEN
        -- Run cron scheduling securely 
        PERFORM cron.schedule(
            'purge-profile-views-weekly', -- unique schedule identifier
            '0 0 * * 0',                  -- cron pattern: Sunday at 00:00 UTC
            'SELECT public.purge_old_profile_views();'
        );
        RAISE NOTICE 'Successfully scheduled weekly profile views cleanup cron task!';
    ELSE
        RAISE WARNING 'The "pg_cron" extension is not enabled on this database. The cleanup function "public.purge_old_profile_views()" has been created successfully, but is not scheduled. To schedule it automatically, enable "pg_cron" in your Supabase dashboard (Database -> Extensions tab) and then run this SQL script again.';
    END IF;
END $$;
