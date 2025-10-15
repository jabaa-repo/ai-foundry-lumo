-- Add project_id to ideas table to properly link ideas to projects
ALTER TABLE public.ideas
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_ideas_project_id ON public.ideas(project_id);