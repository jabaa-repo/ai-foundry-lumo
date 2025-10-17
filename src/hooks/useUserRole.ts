import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type AppRole = 'system_admin' | 'project_owner' | 'team_member' | 'management';
export type TeamType = 'business_innovation' | 'engineering' | 'adoption_outcomes';
export type TeamPosition = 
  | 'business_analyst'
  | 'ai_process_reengineer'
  | 'ai_innovation_executive'
  | 'ai_system_architect'
  | 'ai_system_engineer'
  | 'ai_data_engineer'
  | 'outcomes_analytics_executive'
  | 'education_implementation_executive'
  | 'change_leadership_architect';

export interface UserRoleData {
  role: AppRole | null;
  team: TeamType | null;
  position: TeamPosition | null;
  isLoading: boolean;
}

export function useUserRole(userId?: string) {
  const [roleData, setRoleData] = useState<UserRoleData>({
    role: null,
    team: null,
    position: null,
    isLoading: true,
  });

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!userId) {
        setRoleData({ role: null, team: null, position: null, isLoading: false });
        return;
      }

      try {
        // Fetch user role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .order('role', { ascending: true })
          .limit(1)
          .single();

        // Fetch user profile (team and position)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('team, position')
          .eq('id', userId)
          .single();

        if (roleError && roleError.code !== 'PGRST116') {
          console.error('Error fetching user role:', roleError);
        }

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching user profile:', profileError);
        }

        setRoleData({
          role: roleData?.role as AppRole || null,
          team: profileData?.team as TeamType || null,
          position: profileData?.position as TeamPosition || null,
          isLoading: false,
        });
      } catch (error) {
        console.error('Error in fetchUserRole:', error);
        setRoleData({ role: null, team: null, position: null, isLoading: false });
      }
    };

    fetchUserRole();
  }, [userId]);

  return roleData;
}

export function usePermissions() {
  const [user, setUser] = useState<any>(null);
  const roleData = useUserRole(user?.id);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const canCreateIdea = roleData.role && ['system_admin', 'project_owner', 'team_member'].includes(roleData.role);
  const canDeleteIdea = roleData.role && ['system_admin', 'project_owner'].includes(roleData.role);
  const canArchiveIdea = roleData.role && ['system_admin', 'project_owner'].includes(roleData.role);
  
  const canCreateProject = roleData.role && ['system_admin', 'project_owner'].includes(roleData.role);
  const canDeleteProject = roleData.role && ['system_admin', 'project_owner'].includes(roleData.role);
  const canArchiveProject = roleData.role && ['system_admin', 'project_owner'].includes(roleData.role);
  
  const canCreateTask = roleData.role && ['system_admin', 'project_owner', 'team_member'].includes(roleData.role);
  const canDeleteTask = roleData.role && ['system_admin', 'project_owner'].includes(roleData.role);
  
  const canManageUsers = roleData.role === 'system_admin';
  const canCreateUsers = roleData.role && ['system_admin', 'project_owner'].includes(roleData.role);

  const isSystemAdmin = roleData.role === 'system_admin';
  const isProjectOwner = roleData.role === 'project_owner';
  const isTeamMember = roleData.role === 'team_member';
  const isManagement = roleData.role === 'management';

  return {
    ...roleData,
    canCreateIdea,
    canDeleteIdea,
    canArchiveIdea,
    canCreateProject,
    canDeleteProject,
    canArchiveProject,
    canCreateTask,
    canDeleteTask,
    canManageUsers,
    canCreateUsers,
    isSystemAdmin,
    isProjectOwner,
    isTeamMember,
    isManagement,
  };
}
