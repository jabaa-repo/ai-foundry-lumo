-- Add due_date and departments to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS departments TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add index for due_date queries
CREATE INDEX IF NOT EXISTS idx_projects_due_date ON public.projects(due_date);