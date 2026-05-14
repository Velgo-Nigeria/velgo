-- 1. Remove task count triggers
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN 
        SELECT tgname, relname
        FROM pg_trigger
        JOIN pg_class ON pg_trigger.tgrelid = pg_class.oid
        -- Find triggers that have 'task_count' or 'increment' in their name
        WHERE tgname LIKE '%task_count%' OR tgname LIKE '%increment%'
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', trigger_record.tgname, trigger_record.relname);
    END LOOP;
END $$;

-- 2. Clean up functions
DROP FUNCTION IF EXISTS handle_task_count_on_post() CASCADE;
DROP FUNCTION IF EXISTS handle_task_count_on_acceptance() CASCADE;
DROP FUNCTION IF EXISTS handle_task_count_on_booking_accept() CASCADE;

-- 3. Drop column from profiles with CASCADE
ALTER TABLE profiles DROP COLUMN IF EXISTS task_count CASCADE;

-- 4. Recreate the profile update policies (since dropping the column with CASCADE breaks the policy dependent on it)
DROP POLICY IF EXISTS "Users can update own profile details" ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;

CREATE POLICY "Users can update own profile details" 
ON profiles 
FOR UPDATE 
USING (auth.uid() = id);

CREATE POLICY "Users update own profile" 
ON profiles 
FOR UPDATE 
USING (auth.uid() = id);
