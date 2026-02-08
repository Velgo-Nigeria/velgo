
-- Allow Clients to DELETE their own posted tasks
CREATE POLICY "Clients delete own tasks" ON posted_tasks
    FOR DELETE USING (auth.uid() = client_id);
