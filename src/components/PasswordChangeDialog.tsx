import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface PasswordChangeDialogProps {
  open: boolean;
  onPasswordChanged: () => void;
}

export function PasswordChangeDialog({ open, onPasswordChanged }: PasswordChangeDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Passwords don't match",
        description: "Please make sure both passwords are the same.",
      });
      return;
    }

    // Validate password strength
    if (newPassword.length < 12) {
      toast({
        variant: "destructive",
        title: "Password too short",
        description: "Password must be at least 12 characters long",
      });
      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      toast({
        variant: "destructive",
        title: "Weak password",
        description: "Password must contain at least one uppercase letter",
      });
      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      toast({
        variant: "destructive",
        title: "Weak password",
        description: "Password must contain at least one lowercase letter",
      });
      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      toast({
        variant: "destructive",
        title: "Weak password",
        description: "Password must contain at least one number",
      });
      return;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      toast({
        variant: "destructive",
        title: "Weak password",
        description: "Password must contain at least one special character",
      });
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      // Update profile to mark password as changed
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ needs_password_change: false })
          .eq('id', user.id);

        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }

      toast({
        title: "Password changed",
        description: "Your password has been successfully updated.",
      });

      onPasswordChanged();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to change password",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Change Your Password</DialogTitle>
          <DialogDescription>
            You must change your temporary password before continuing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={12}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm Password</Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={12}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Changing Password...
              </>
            ) : (
              "Change Password"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
