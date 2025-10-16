-- Add backlog column to tasks table to associate tasks with specific backlogs
ALTER TABLE public.tasks 
ADD COLUMN backlog backlog_type;

-- Update existing tasks to be in business_innovation backlog by default
UPDATE public.tasks 
SET backlog = 'business_innovation' 
WHERE backlog IS NULL;