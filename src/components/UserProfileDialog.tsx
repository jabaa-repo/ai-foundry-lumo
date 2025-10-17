import { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  profile: any;
  onProfileUpdate: (profile: any) => void;
}

export function UserProfileDialog({
  open,
  onOpenChange,
  user,
  profile,
  onProfileUpdate,
}: UserProfileDialogProps) {
  const [displayName, setDisplayName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const { toast } = useToast();

  // Sync displayName with profile data
  useEffect(() => {
    if (profile?.display_name) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!user) return;

    setIsUpdating(true);

    try {
      // Update display name
      if (displayName !== profile?.display_name) {
        const { error } = await supabase
          .from('profiles')
          .update({ display_name: displayName })
          .eq('id', user.id);

        if (error) throw error;
      }

      toast({
        title: "Profile updated",
        description: "Your profile has been successfully updated.",
      });

      onProfileUpdate({ ...profile, display_name: displayName });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
      });
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordFields(false);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Password change failed",
        description: error.message,
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Profile Settings</DialogTitle>
          <DialogDescription>
            Manage your account information and security settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Info */}
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.avatar_url} alt={profile?.display_name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                {getInitials(profile?.display_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="space-y-2">
                <Label htmlFor="display-name">Display Name</Label>
                <Input
                  id="display-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user?.email || ""} disabled className="bg-muted" />
          </div>

          {profile?.position && (
            <div className="space-y-2">
              <Label>Position</Label>
              <Input
                value={profile.position.split('_').map((w: string) => 
                  w.charAt(0).toUpperCase() + w.slice(1)
                ).join(' ')}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          {profile?.team && (
            <div className="space-y-2">
              <Label>Team</Label>
              <Input
                value={profile.team.split('_').map((w: string) => 
                  w.charAt(0).toUpperCase() + w.slice(1)
                ).join(' ')}
                disabled
                className="bg-muted"
              />
            </div>
          )}

          <Separator />

          {/* Password Section */}
          {!showPasswordFields ? (
            <Button
              variant="outline"
              onClick={() => setShowPasswordFields(true)}
              className="w-full"
            >
              <KeyRound className="mr-2 h-4 w-4" />
              Change Password
            </Button>
          ) : (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Change Password</h4>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={6}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowPasswordFields(false);
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleChangePassword}
                  disabled={isUpdating || !newPassword || !confirmPassword}
                  className="flex-1"
                >
                  {isUpdating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Password"
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={handleUpdateProfile}
            disabled={isUpdating || displayName === profile?.display_name}
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
