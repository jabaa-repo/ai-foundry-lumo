-- Add start_date to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date timestamp with time zone;

-- Add fields to store responsible and accountable role names
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS responsible_role text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS accountable_role text;

-- Create task_activities table for checkbox items
CREATE TABLE IF NOT EXISTS public.task_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.task_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all task activities"
  ON public.task_activities FOR SELECT
  USING (true);

CREATE POLICY "Users can create task activities"
  ON public.task_activities FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update task activities"
  ON public.task_activities FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete task activities"
  ON public.task_activities FOR DELETE
  USING (true);

-- Create task_comments table
CREATE TABLE IF NOT EXISTS public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all task comments"
  ON public.task_comments FOR SELECT
  USING (true);

CREATE POLICY "Users can create task comments"
  ON public.task_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.task_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Create task_activity_log table for activity tracking
CREATE TABLE IF NOT EXISTS public.task_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL,
  details text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.task_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all task activity logs"
  ON public.task_activity_log FOR SELECT
  USING (true);

CREATE POLICY "Users can create task activity logs"
  ON public.task_activity_log FOR INSERT
  WITH CHECK (true);

-- Create trigger for task_activities updated_at
CREATE OR REPLACE TRIGGER update_task_activities_updated_at
  BEFORE UPDATE ON public.task_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();