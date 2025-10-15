-- Add project_id column to tasks table
ALTER TABLE public.tasks
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);