-- Create table for multiple responsible persons per task
CREATE TABLE IF NOT EXISTS public.task_responsible_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(task_id, user_id)
);

-- Enable RLS
ALTER TABLE public.task_responsible_users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all task responsible assignments"
  ON public.task_responsible_users FOR SELECT
  USING (true);

CREATE POLICY "Users can insert task responsible assignments"
  ON public.task_responsible_users FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete task responsible assignments"
  ON public.task_responsible_users FOR DELETE
  USING (true);