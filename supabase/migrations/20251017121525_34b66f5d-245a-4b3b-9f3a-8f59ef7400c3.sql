-- Drop existing policies on user_roles that cause infinite recursion
DROP POLICY IF EXISTS "System admins can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Create new policies using security definer functions to avoid recursion
-- Allow system admins to manage all roles
CREATE POLICY "System admins can manage all roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'system_admin'::app_role));

-- Allow users to view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'system_admin'::app_role));