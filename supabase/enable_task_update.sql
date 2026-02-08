
-- Allow Clients to UPDATE their own posted tasks (e.g. to change status to 'assigned')
CREATE POLICY "Clients update own tasks" ON posted_tasks
    FOR UPDATE USING (auth.uid() = client_id);
