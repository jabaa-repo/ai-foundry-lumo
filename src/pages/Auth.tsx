import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import huboLogo from "@/assets/hubo-logo.png";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has a role assigned
      if (data.user) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (roleError) {
          console.error('Error fetching user role:', roleError);
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to verify user permissions. Please try again.",
          });
          setLoading(false);
          return;
        }

        if (!roleData) {
          await supabase.auth.signOut();
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "Your account does not have a role assigned. Please contact an administrator.",
          });
          setLoading(false);
          return;
        }

        console.log('User role verified:', roleData.role);
      }

      toast({
        title: "Welcome back!",
        description: "You've successfully logged in.",
      });
      navigate("/");
    } catch (error: any) {
      console.error('Authentication error:', error);
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary-light/20 to-accent-light flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="space-y-3 flex flex-col items-center">
          <img src={huboLogo} alt="Hubo" className="h-16 w-auto" />
          <div className="text-center">
            <CardTitle className="text-3xl font-bold text-primary">hubo</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              From source to success
            </CardDescription>
          </div>
          <CardDescription>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your.email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="border-border focus:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="border-border focus:ring-primary"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}