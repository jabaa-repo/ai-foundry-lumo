-- Update all tasks with 'todo' status to 'in_progress'
UPDATE public.tasks
SET status = 'in_progress'
WHERE status = 'todo';

-- Temporarily remove the default
ALTER TABLE public.tasks ALTER COLUMN status DROP DEFAULT;

-- Recreate the task_status enum without 'todo'
-- First, create a new enum type
CREATE TYPE task_status_new AS ENUM ('unassigned', 'in_progress', 'done');

-- Alter the column to use the new type
ALTER TABLE public.tasks 
  ALTER COLUMN status TYPE task_status_new 
  USING status::text::task_status_new;

-- Drop the old type and rename the new one
DROP TYPE task_status;
ALTER TYPE task_status_new RENAME TO task_status;

-- Set the new default
ALTER TABLE public.tasks ALTER COLUMN status SET DEFAULT 'in_progress'::task_status;