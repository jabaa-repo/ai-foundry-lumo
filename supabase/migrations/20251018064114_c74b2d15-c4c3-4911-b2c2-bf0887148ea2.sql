-- Fix overly permissive RLS policies and email exposure

-- 1. Drop existing overly permissive policies on experiments table
DROP POLICY IF EXISTS "Users can view all experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can create experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can update experiments" ON public.experiments;
DROP POLICY IF EXISTS "Users can delete experiments" ON public.experiments;

-- Create restrictive policies for experiments (only project participants and system admins)
CREATE POLICY "Users can view project experiments"
ON public.experiments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = experiments.project_id
    AND (
      p.owner_id = auth.uid() 
      OR p.responsible_id = auth.uid() 
      OR p.accountable_id = auth.uid()
      OR auth.uid() = ANY(p.consulted_ids) 
      OR auth.uid() = ANY(p.informed_ids)
    )
  ) OR has_role(auth.uid(), 'system_admin'::app_role)
);

CREATE POLICY "Project participants can create experiments"
ON public.experiments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = experiments.project_id
    AND (
      p.owner_id = auth.uid() 
      OR p.responsible_id = auth.uid() 
      OR p.accountable_id = auth.uid()
      OR auth.uid() = ANY(p.consulted_ids)
    )
  ) OR has_role(auth.uid(), 'system_admin'::app_role)
);

CREATE POLICY "Project participants can update experiments"
ON public.experiments FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = experiments.project_id
    AND (
      p.owner_id = auth.uid() 
      OR p.responsible_id = auth.uid() 
      OR p.accountable_id = auth.uid()
      OR auth.uid() = ANY(p.consulted_ids)
    )
  ) OR has_role(auth.uid(), 'system_admin'::app_role)
);

CREATE POLICY "Project owners and admins can delete experiments"
ON public.experiments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = experiments.project_id
    AND p.owner_id = auth.uid()
  ) OR has_role(auth.uid(), 'system_admin'::app_role)
);

-- 2. Fix task_activities policies
DROP POLICY IF EXISTS "Users can view all task activities" ON public.task_activities;
DROP POLICY IF EXISTS "Users can create task activities" ON public.task_activities;
DROP POLICY IF EXISTS "Users can update task activities" ON public.task_activities;
DROP POLICY IF EXISTS "Users can delete task activities" ON public.task_activities;

CREATE POLICY "Users can view task activities for accessible tasks"
ON public.task_activities FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_activities.task_id
    AND (
      t.assigned_to = auth.uid()
      OR t.owner_id = auth.uid()
      OR t.accountable_id = auth.uid()
      OR p.owner_id = auth.uid()
      OR p.responsible_id = auth.uid()
      OR p.accountable_id = auth.uid()
      OR auth.uid() = ANY(p.consulted_ids)
      OR auth.uid() = ANY(p.informed_ids)
      OR has_role(auth.uid(), 'system_admin'::app_role)
    )
  )
);

CREATE POLICY "Task participants can create activities"
ON public.task_activities FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_activities.task_id
    AND (
      t.assigned_to = auth.uid()
      OR t.owner_id = auth.uid()
      OR t.accountable_id = auth.uid()
      OR p.owner_id = auth.uid()
      OR p.responsible_id = auth.uid()
      OR has_role(auth.uid(), 'system_admin'::app_role)
    )
  )
);

CREATE POLICY "Task participants can update activities"
ON public.task_activities FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_activities.task_id
    AND (
      t.assigned_to = auth.uid()
      OR t.owner_id = auth.uid()
      OR t.accountable_id = auth.uid()
      OR p.owner_id = auth.uid()
      OR p.responsible_id = auth.uid()
      OR has_role(auth.uid(), 'system_admin'::app_role)
    )
  )
);

CREATE POLICY "Project owners and admins can delete activities"
ON public.task_activities FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_activities.task_id
    AND (
      p.owner_id = auth.uid()
      OR has_role(auth.uid(), 'system_admin'::app_role)
    )
  )
);

-- 3. Fix task_activity_log - make it append-only (remove DELETE, restrict UPDATE)
DROP POLICY IF EXISTS "Users can view all task activity logs" ON public.task_activity_log;
DROP POLICY IF EXISTS "Users can create task activity logs" ON public.task_activity_log;

CREATE POLICY "Users can view activity logs for accessible tasks"
ON public.task_activity_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_activity_log.task_id
    AND (
      t.assigned_to = auth.uid()
      OR t.owner_id = auth.uid()
      OR t.accountable_id = auth.uid()
      OR p.owner_id = auth.uid()
      OR p.responsible_id = auth.uid()
      OR p.accountable_id = auth.uid()
      OR auth.uid() = ANY(p.consulted_ids)
      OR auth.uid() = ANY(p.informed_ids)
      OR has_role(auth.uid(), 'system_admin'::app_role)
    )
  )
);

CREATE POLICY "System can create activity logs"
ON public.task_activity_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 4. Fix task_responsible_users - only project owners and admins can manage
DROP POLICY IF EXISTS "Users can view all task responsible assignments" ON public.task_responsible_users;
DROP POLICY IF EXISTS "Users can insert task responsible assignments" ON public.task_responsible_users;
DROP POLICY IF EXISTS "Users can delete task responsible assignments" ON public.task_responsible_users;

CREATE POLICY "Users can view task assignments for accessible tasks"
ON public.task_responsible_users FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_responsible_users.task_id
    AND (
      t.assigned_to = auth.uid()
      OR t.owner_id = auth.uid()
      OR t.accountable_id = auth.uid()
      OR p.owner_id = auth.uid()
      OR p.responsible_id = auth.uid()
      OR p.accountable_id = auth.uid()
      OR auth.uid() = ANY(p.consulted_ids)
      OR auth.uid() = ANY(p.informed_ids)
      OR has_role(auth.uid(), 'system_admin'::app_role)
    )
  )
);

CREATE POLICY "Project owners and admins can assign task responsibilities"
ON public.task_responsible_users FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_responsible_users.task_id
    AND (
      p.owner_id = auth.uid()
      OR has_role(auth.uid(), 'system_admin'::app_role)
    )
  )
);

CREATE POLICY "Project owners and admins can remove task responsibilities"
ON public.task_responsible_users FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_responsible_users.task_id
    AND (
      p.owner_id = auth.uid()
      OR has_role(auth.uid(), 'system_admin'::app_role)
    )
  )
);

-- 5. Fix task_comments visibility - only accessible to task participants
DROP POLICY IF EXISTS "Users can view all task comments" ON public.task_comments;

CREATE POLICY "Users can view task comments for accessible tasks"
ON public.task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    LEFT JOIN public.projects p ON t.project_id = p.id
    WHERE t.id = task_comments.task_id
    AND (
      t.assigned_to = auth.uid()
      OR t.owner_id = auth.uid()
      OR t.accountable_id = auth.uid()
      OR p.owner_id = auth.uid()
      OR p.responsible_id = auth.uid()
      OR p.accountable_id = auth.uid()
      OR auth.uid() = ANY(p.consulted_ids)
      OR auth.uid() = ANY(p.informed_ids)
      OR has_role(auth.uid(), 'system_admin'::app_role)
    )
  )
);

-- 6. Remove email column from profiles table (recommended approach for email exposure)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Update the handle_new_user trigger to not copy email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'display_name'
  );
  RETURN new;
END;
$$;