import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2, Mail, Trash2, Pencil } from 'lucide-react';
import type { AppRole, TeamType, TeamPosition } from '@/hooks/useUserRole';
import AIRoleSelector, { AI_FOUNDRY_ROLES } from '@/components/AIRoleSelector';

interface UserProfile {
  id: string;
  display_name: string | null;
  email: string | null;
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const [newUser, setNewUser] = useState({
    email: '',
    display_name: '',
    role: 'team_member' as AppRole,
    position: '' as TeamPosition | '',
  });

  const [editUser, setEditUser] = useState({
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
        .select('id, display_name, email, avatar_url, team, position')
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
    const requiresPosition = !['system_admin', 'project_owner', 'management'].includes(newUser.role);
    
    if (!newUser.email || !newUser.display_name) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in email and name.',
        variant: 'destructive',
      });
      return;
    }

    if (requiresPosition && !newUser.position) {
      toast({
        title: 'Validation Error',
        description: 'Team members must have a position assigned.',
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);
    try {
      // Determine team from position
      const team = newUser.position ? getTeamTypeFromPosition(newUser.position as TeamPosition) : null;

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke('create-user-invitation', {
        body: {
          email: newUser.email,
          display_name: newUser.display_name,
          role: newUser.role,
          position: newUser.position || null,
          team: team,
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      toast({
        title: 'Success',
        description: `User created and invitation email sent to ${newUser.email}`,
      });

      setShowCreateDialog(false);
      setNewUser({
        email: '',
        display_name: '',
        role: 'team_member',
        position: '',
      });
      
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const getTeamTypeFromPosition = (position: TeamPosition): TeamType | null => {
    if (['business_analyst', 'ai_process_reengineer', 'ai_innovation_executive'].includes(position)) {
      return 'business_innovation';
    } else if (['ai_system_architect', 'ai_system_engineer', 'ai_data_engineer'].includes(position)) {
      return 'engineering';
    } else if (['outcomes_analytics_executive', 'education_implementation_executive', 'change_leadership_architect'].includes(position)) {
      return 'adoption_outcomes';
    }
    return null;
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    
    if (!permissions.isSystemAdmin) {
      toast({
        title: 'Access Denied',
        description: 'Only system administrators can delete users.',
        variant: 'destructive',
      });
      return;
    }

    setIsDeleting(true);
    try {
      // Delete user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userToDelete.id);

      if (roleError) throw roleError;

      toast({
        title: 'Success',
        description: 'User role removed successfully.',
      });

      setShowDeleteDialog(false);
      setUserToDelete(null);
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete user.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
    setShowDeleteDialog(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setEditUser({
      display_name: user.display_name || '',
      role: user.user_roles[0]?.role || 'team_member',
      position: user.position || '',
    });
    setShowEditDialog(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    const requiresPosition = !['system_admin', 'project_owner', 'management'].includes(editUser.role);
    
    if (!editUser.display_name) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in the name.',
        variant: 'destructive',
      });
      return;
    }

    if (requiresPosition && !editUser.position) {
      toast({
        title: 'Validation Error',
        description: 'Team members must have a position assigned.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);
    try {
      // Determine team from position
      const team = editUser.position ? getTeamTypeFromPosition(editUser.position as TeamPosition) : null;

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          display_name: editUser.display_name,
          team: team,
          position: editUser.position || null,
        })
        .eq('id', selectedUser.id);

      if (profileError) throw profileError;

      // Update role if changed
      const currentRole = selectedUser.user_roles[0]?.role;
      if (currentRole !== editUser.role) {
        // Delete old role
        if (currentRole) {
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', selectedUser.id)
            .eq('role', currentRole);
        }

        // Insert new role
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: selectedUser.id,
            role: editUser.role,
          });

        if (roleError) throw roleError;
      }

      toast({
        title: 'Success',
        description: 'User updated successfully.',
      });

      setShowEditDialog(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update user.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
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

  const getPositionLabel = (position: TeamPosition | null, role: AppRole | undefined) => {
    // System admin, project owner, and management don't have positions
    if (role && ['system_admin', 'project_owner', 'management'].includes(role)) {
      return '-';
    }
    
    if (!position) return 'Not assigned';
    const roleInfo = AI_FOUNDRY_ROLES.find(r => r.id === position);
    return roleInfo?.name || position;
  };

  const getTeamFromPosition = (position: TeamPosition | null, role: AppRole | undefined): string => {
    // System admin, project owner, and management don't have teams
    if (role && ['system_admin', 'project_owner', 'management'].includes(role)) {
      return '-';
    }
    
    if (!position) return 'Not assigned';
    
    if (['business_analyst', 'ai_process_reengineer', 'ai_innovation_executive'].includes(position)) {
      return 'Business Innovation';
    } else if (['ai_system_architect', 'ai_system_engineer', 'ai_data_engineer'].includes(position)) {
      return 'Engineering';
    } else {
      return 'Adoption & Outcomes';
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
                <TableHead>Title</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>Access Role</TableHead>
                {permissions.isSystemAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{getPositionLabel(user.position, user.user_roles[0]?.role)}</TableCell>
                  <TableCell className="font-medium">{user.display_name || 'Unknown'}</TableCell>
                  <TableCell className="text-muted-foreground">{user.email || 'No email'}</TableCell>
                  <TableCell>{getTeamFromPosition(user.position, user.user_roles[0]?.role)}</TableCell>
                  <TableCell>
                    {user.user_roles.map((ur, index) => (
                      <Badge key={index} className={`${getRoleColor(ur.role)} text-white mr-2`}>
                        {getRoleLabel(ur.role)}
                      </Badge>
                    ))}
                  </TableCell>
                  {permissions.isSystemAdmin && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditUser(user)}
                        >
                          <Pencil className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => confirmDeleteUser(user)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
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
            {!['system_admin', 'project_owner', 'management'].includes(newUser.role) && (
              <AIRoleSelector
                value={newUser.position}
                onValueChange={(value) => setNewUser({ ...newUser, position: value as TeamPosition })}
              />
            )}
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

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update user information, role, and team assignment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter full name"
                value={editUser.display_name}
                onChange={(e) => setEditUser({ ...editUser, display_name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={selectedUser?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role">Access Role</Label>
              <Select
                value={editUser.role}
                onValueChange={(value) => setEditUser({ ...editUser, role: value as AppRole })}
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
            {!['system_admin', 'project_owner', 'management'].includes(editUser.role) && (
              <AIRoleSelector
                value={editUser.position}
                onValueChange={(value) => setEditUser({ ...editUser, position: value as TeamPosition })}
              />
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update User'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{userToDelete?.display_name}</strong>'s role and access to the system. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete User'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
