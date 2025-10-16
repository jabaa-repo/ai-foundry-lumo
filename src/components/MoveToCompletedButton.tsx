import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MoveToCompletedButtonProps {
  projectId: string;
  currentBacklog: string;
  canComplete: boolean;
  onSuccess?: () => void;
  className?: string;
}

export function MoveToCompletedButton({
  projectId,
  currentBacklog,
  canComplete,
  onSuccess,
  className,
}: MoveToCompletedButtonProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("projects")
        .update({ 
          status: "completed"
        })
        .eq("id", projectId);

      if (error) throw error;

      // Show celebration
      setShowConfirmDialog(false);
      showCelebration();

      toast({
        title: "🎉 Congratulations!",
        description: "Project completed successfully!",
      });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error completing project:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to complete project",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const showCelebration = () => {
    // Create celebration overlay
    const overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';
    overlay.innerHTML = `
      <div class="celebration-content">
        <div class="fireworks"></div>
        <div class="fireworks"></div>
        <div class="fireworks"></div>
        <h2 class="celebration-text">🎉 Congratulations! 🎉</h2>
        <p class="celebration-subtext">Project Completed Successfully!</p>
      </div>
    `;
    document.body.appendChild(overlay);

    // Remove after animation
    setTimeout(() => {
      overlay.remove();
    }, 4000);
  };

  if (currentBacklog !== "outcomes_adoption" || !canComplete) {
    return null;
  }

  return (
    <>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          setShowConfirmDialog(true);
        }}
        disabled={isLoading}
        size="sm"
        variant="outline"
        className={`h-8 text-xs ${className}`}
      >
        <CheckCircle className="h-3 w-3 mr-1" />
        Move to Completed
      </Button>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Complete Project?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark the project as completed and move it to the completed backlog.
              All tasks should be finished before completing the project.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleComplete} disabled={isLoading}>
              {isLoading ? "Completing..." : "Complete Project"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
