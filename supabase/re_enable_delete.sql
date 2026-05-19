-- Drop any existing delete policies on posted_tasks
DROP POLICY IF EXISTS "Users can delete own tasks" ON posted_tasks;
DROP POLICY IF EXISTS "Clients delete own tasks" ON posted_tasks;

-- Create the delete policy
CREATE POLICY "Clients delete own tasks" ON posted_tasks
FOR DELETE USING (auth.uid() = client_id);
