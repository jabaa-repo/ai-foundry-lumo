-- Add RACI assignments to ideas and projects tables
ALTER TABLE public.ideas 
ADD COLUMN IF NOT EXISTS responsible_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS accountable_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS consulted_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS informed_ids uuid[] DEFAULT '{}';

ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS responsible_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS accountable_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS consulted_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS informed_ids uuid[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Add task linking to ideas (already exists as idea_id in tasks table)
-- Add checklist completion tracking
ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ideas_responsible ON public.ideas(responsible_id);
CREATE INDEX IF NOT EXISTS idx_ideas_accountable ON public.ideas(accountable_id);
CREATE INDEX IF NOT EXISTS idx_projects_responsible ON public.projects(responsible_id);
CREATE INDEX IF NOT EXISTS idx_projects_accountable ON public.projects(accountable_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_owner ON public.tasks(owner_id);