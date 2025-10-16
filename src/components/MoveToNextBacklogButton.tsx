import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useProjectProgression } from "@/hooks/useProjectProgression";
import { useState } from "react";
import BacklogTaskGenerationDialog from "./BacklogTaskGenerationDialog";

interface MoveToNextBacklogButtonProps {
  projectId: string;
  currentBacklog: string;
  onSuccess?: () => void;
  className?: string;
}

export function MoveToNextBacklogButton({ 
  projectId, 
  currentBacklog, 
  onSuccess,
  className 
}: MoveToNextBacklogButtonProps) {
  const { canProgress, isLoading, nextBacklog } = useProjectProgression(
    projectId, 
    currentBacklog
  );
  const [showTaskDialog, setShowTaskDialog] = useState(false);

  const handleProgress = () => {
    // For engineering and outcomes_adoption, show task generation dialog
    if (canProgress && (currentBacklog === 'business_innovation' || currentBacklog === 'engineering')) {
      setShowTaskDialog(true);
    }
  };

  const handleTaskGenerationSuccess = () => {
    setShowTaskDialog(false);
    if (onSuccess) {
      onSuccess();
    }
  };

  if (!nextBacklog || currentBacklog === 'completed' || currentBacklog === 'outcomes_adoption' || !canProgress) {
    return null;
  }

  // Determine the next backlog phase
  const nextBacklogPhase = currentBacklog === 'business_innovation' 
    ? 'engineering' 
    : currentBacklog === 'engineering' 
    ? 'outcomes_adoption' 
    : null;

  return (
    <>
      <Button
        onClick={(e) => {
          e.stopPropagation();
          handleProgress();
        }}
        disabled={isLoading}
        size="sm"
        variant="outline"
        className={`h-8 text-xs ${className}`}
      >
        <ArrowRight className="h-3 w-3 mr-1" />
        Move to {nextBacklog}
      </Button>

      {nextBacklogPhase && (
        <BacklogTaskGenerationDialog
          open={showTaskDialog}
          onOpenChange={setShowTaskDialog}
          projectId={projectId}
          currentBacklog={currentBacklog}
          nextBacklog={nextBacklogPhase}
          onSuccess={handleTaskGenerationSuccess}
        />
      )}
    </>
  );
}
