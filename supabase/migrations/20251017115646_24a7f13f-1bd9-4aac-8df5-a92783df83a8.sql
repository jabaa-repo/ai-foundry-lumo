-- Create enum for main access roles
CREATE TYPE public.app_role AS ENUM ('system_admin', 'project_owner', 'team_member', 'management');

-- Create enum for teams
CREATE TYPE public.team_type AS ENUM ('business_innovation', 'engineering', 'adoption_outcomes');

-- Create enum for team positions
CREATE TYPE public.team_position AS ENUM (
  'business_analyst',
  'ai_process_reengineer', 
  'ai_innovation_executive',
  'ai_system_architect',
  'ai_system_engineer',
  'ai_data_engineer',
  'outcomes_analytics_executive',
  'education_implementation_executive',
  'change_leadership_architect'
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "System admins can manage all roles"
ON public.user_roles
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role = 'system_admin'
  )
);

CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

-- Add team and position columns to profiles
ALTER TABLE public.profiles
ADD COLUMN team team_type,
ADD COLUMN position team_position;

-- Create security definer function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- Create function to check if user has any of multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID, _roles app_role[])
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = ANY(_roles)
  );
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role
      WHEN 'system_admin' THEN 1
      WHEN 'project_owner' THEN 2
      WHEN 'team_member' THEN 3
      WHEN 'management' THEN 4
    END
  LIMIT 1;
$$;

-- Update profiles RLS policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
CREATE POLICY "All authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Allow system admins to update any profile
CREATE POLICY "System admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.has_role(auth.uid(), 'system_admin'));

-- Update ideas RLS policies for role-based access
DROP POLICY IF EXISTS "Users can create ideas" ON public.ideas;
CREATE POLICY "Project owners and team members can create ideas"
ON public.ideas
FOR INSERT
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['system_admin', 'project_owner', 'team_member']::app_role[])
);

DROP POLICY IF EXISTS "Users can delete own ideas" ON public.ideas;
CREATE POLICY "Project owners and system admins can delete ideas"
ON public.ideas
FOR DELETE
USING (
  public.has_any_role(auth.uid(), ARRAY['system_admin', 'project_owner']::app_role[])
);

DROP POLICY IF EXISTS "Users can update ideas" ON public.ideas;
CREATE POLICY "Project owners and team members can update ideas"
ON public.ideas
FOR UPDATE
USING (
  public.has_any_role(auth.uid(), ARRAY['system_admin', 'project_owner', 'team_member']::app_role[])
);

-- Update projects RLS policies
DROP POLICY IF EXISTS "Users can create projects" ON public.projects;
CREATE POLICY "Project owners and system admins can create projects"
ON public.projects
FOR INSERT
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['system_admin', 'project_owner']::app_role[])
);

DROP POLICY IF EXISTS "Users can delete projects" ON public.projects;
CREATE POLICY "Project owners and system admins can delete projects"
ON public.projects
FOR DELETE
USING (
  public.has_any_role(auth.uid(), ARRAY['system_admin', 'project_owner']::app_role[])
);

DROP POLICY IF EXISTS "Users can update projects" ON public.projects;
CREATE POLICY "Project owners, system admins, and team members can update projects"
ON public.projects
FOR UPDATE
USING (
  public.has_any_role(auth.uid(), ARRAY['system_admin', 'project_owner', 'team_member']::app_role[])
);

-- Update tasks RLS policies
DROP POLICY IF EXISTS "Users can create tasks" ON public.tasks;
CREATE POLICY "Project owners, system admins, and team members can create tasks"
ON public.tasks
FOR INSERT
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['system_admin', 'project_owner', 'team_member']::app_role[])
);

DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
CREATE POLICY "All authenticated users can update tasks"
ON public.tasks
FOR UPDATE
USING (
  public.has_any_role(auth.uid(), ARRAY['system_admin', 'project_owner', 'team_member']::app_role[])
);

DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;
CREATE POLICY "Project owners and system admins can delete tasks"
ON public.tasks
FOR DELETE
USING (
  public.has_any_role(auth.uid(), ARRAY['system_admin', 'project_owner']::app_role[])
);

-- Update archived_ideas RLS policies
DROP POLICY IF EXISTS "Users can create archived ideas" ON public.archived_ideas;
CREATE POLICY "Project owners and system admins can create archived ideas"
ON public.archived_ideas
FOR INSERT
WITH CHECK (
  public.has_any_role(auth.uid(), ARRAY['system_admin', 'project_owner']::app_role[])
);

DROP POLICY IF EXISTS "Users can delete own archived ideas" ON public.archived_ideas;
CREATE POLICY "Project owners and system admins can delete archived ideas"
ON public.archived_ideas
FOR DELETE
USING (
  public.has_any_role(auth.uid(), ARRAY['system_admin', 'project_owner']::app_role[])
);