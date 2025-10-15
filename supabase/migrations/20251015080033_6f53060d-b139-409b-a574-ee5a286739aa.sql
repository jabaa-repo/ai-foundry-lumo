-- Add backlog enum type
CREATE TYPE public.backlog_type AS ENUM ('business_innovation', 'engineering', 'outcomes_adoption');

-- Add new required fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS project_number TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS project_brief TEXT,
ADD COLUMN IF NOT EXISTS desired_outcomes TEXT,
ADD COLUMN IF NOT EXISTS backlog backlog_type DEFAULT 'business_innovation',
ADD COLUMN IF NOT EXISTS workflow_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS last_activity_date TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add NOT NULL constraints after setting defaults
UPDATE public.projects SET project_brief = description WHERE project_brief IS NULL;
UPDATE public.projects SET desired_outcomes = '' WHERE desired_outcomes IS NULL;

ALTER TABLE public.projects
ALTER COLUMN project_brief SET NOT NULL,
ALTER COLUMN desired_outcomes SET NOT NULL;

-- Create function to generate project number with AI tag format
CREATE OR REPLACE FUNCTION public.generate_project_number(ai_tag TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  date_part TEXT;
  next_number INTEGER;
  new_number TEXT;
BEGIN
  -- Format: TAG-DDMMYYYY-XXX
  date_part := TO_CHAR(CURRENT_DATE, 'DDMMYYYY');
  
  -- Get the next incremental number for this tag and date
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(project_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO next_number
  FROM public.projects
  WHERE project_number LIKE ai_tag || '-' || date_part || '-%';
  
  new_number := ai_tag || '-' || date_part || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_number;
END;
$$;