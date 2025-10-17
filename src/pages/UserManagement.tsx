import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Mail, Trash2 } from 'lucide-react';
import type { AppRole, TeamType, TeamPosition } from '@/hooks/useUserRole';
import AIRoleSelector, { AI_FOUNDRY_ROLES } from '@/components/AIRoleSelector';

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  team: TeamType | null;
  position: TeamPosition | null;
  user_roles: { role: AppRole }[];
}

export default function UserManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const permissions = usePermissions();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [newUser, setNewUser] = useState({
    email: '',
    display_name: '',
    role: 'team_member' as AppRole,
    position: '' as TeamPosition | '',
  });

  useEffect(() => {
    if (!permissions.isLoading && !permissions.canManageUsers && !permissions.canCreateUsers) {
      toast({
        title: 'Access Denied',
        description: 'You do not have permission to access this page.',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    fetchUsers();
  }, [permissions.isLoading, permissions.canManageUsers, permissions.canCreateUsers, navigate, toast]);

  const fetchUsers = async () => {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, team, position')
        .order('display_name');

      if (profilesError) throw profilesError;

      // Fetch roles for all users
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Combine the data
      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        user_roles: (roles || [])
          .filter(r => r.user_id === profile.id)
          .map(r => ({ role: r.role as AppRole }))
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch users.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.display_name || !newUser.position) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      // In a real application, you would use Supabase Admin API to create users
      // For now, we'll show a message to send an invitation
      toast({
        title: 'Invitation Ready',
        description: `Please send an invitation email to ${newUser.email} to complete the registration.`,
      });

      setShowCreateDialog(false);
      setNewUser({
        email: '',
        display_name: '',
        role: 'team_member',
        position: '',
      });
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: 'Failed to create user.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!permissions.isSystemAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only system administrators can delete users.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'User role removed successfully.',
      });

      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user.',
        variant: 'destructive',
      });
    }
  };

  const getRoleColor = (role: AppRole) => {
    switch (role) {
      case 'system_admin': return 'bg-red-500';
      case 'project_owner': return 'bg-blue-500';
      case 'team_member': return 'bg-green-500';
      case 'management': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleLabel = (role: AppRole) => {
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getPositionLabel = (position: TeamPosition | null) => {
    if (!position) return 'Not assigned';
    const role = AI_FOUNDRY_ROLES.find(r => r.id === position);
    return role?.name || position;
  };

  const getTeamFromPosition = (position: TeamPosition): TeamType => {
    if (['business_analyst', 'ai_process_reengineer', 'ai_innovation_executive'].includes(position)) {
      return 'business_innovation';
    } else if (['ai_system_architect', 'ai_system_engineer', 'ai_data_engineer'].includes(position)) {
      return 'engineering';
    } else {
      return 'adoption_outcomes';
    }
  };

  if (permissions.isLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
        {permissions.canCreateUsers && (
          <Button onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Users</CardTitle>
          <CardDescription>All users and their assigned roles</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Team</TableHead>
                {permissions.isSystemAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.display_name || 'Unknown'}</TableCell>
                  <TableCell>
                    {user.user_roles.map((ur, index) => (
                      <Badge key={index} className={`${getRoleColor(ur.role)} text-white mr-2`}>
                        {getRoleLabel(ur.role)}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell>{getPositionLabel(user.position)}</TableCell>
                  <TableCell>
                    {user.team ? (
                      <Badge variant="outline">
                        {user.team.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                      </Badge>
                    ) : (
                      'Not assigned'
                    )}
                  </TableCell>
                  {permissions.isSystemAdmin && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account and assign their role and team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={newUser.display_name}
                onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Access Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser({ ...newUser, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system_admin">System Admin</SelectItem>
                  <SelectItem value="project_owner">Project Owner</SelectItem>
                  <SelectItem value="team_member">Team Member</SelectItem>
                  <SelectItem value="management">Management</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <AIRoleSelector
              value={newUser.position}
              onValueChange={(value) => setNewUser({ ...newUser, position: value as TeamPosition })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={isCreating}>
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
