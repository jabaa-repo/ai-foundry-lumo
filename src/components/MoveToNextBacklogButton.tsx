import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useProjectProgression } from "@/hooks/useProjectProgression";

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
  const { canProgress, isLoading, progressProject, nextBacklog } = useProjectProgression(
    projectId, 
    currentBacklog
  );

  const handleProgress = async () => {
    await progressProject();
    if (onSuccess) {
      onSuccess();
    }
  };

  if (!nextBacklog || currentBacklog === 'completed') {
    return null;
  }

  return (
    <Button
      onClick={handleProgress}
      disabled={!canProgress || isLoading}
      size="sm"
      className={className}
    >
      <ArrowRight className="h-4 w-4 mr-2" />
      Move to {nextBacklog}
    </Button>
  );
}
