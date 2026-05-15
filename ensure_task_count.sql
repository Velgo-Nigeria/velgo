-- Ensure task_count column exists to fix the "column task_count does not exist" error
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS task_count INTEGER DEFAULT 0;
