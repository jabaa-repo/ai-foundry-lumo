import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { checkAndProgressProjectBacklog } from "@/utils/projectBacklogProgression";
import { useToast } from "@/hooks/use-toast";

interface UseProjectProgressionResult {
  canProgress: boolean;
  isLoading: boolean;
  progressProject: () => Promise<void>;
  nextBacklog: string | null;
}

export function useProjectProgression(projectId: string, currentBacklog: string): UseProjectProgressionResult {
  const [canProgress, setCanProgress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkIfCanProgress();
  }, [projectId]);

  const checkIfCanProgress = async () => {
    try {
      // Only check if currentBacklog is valid
      if (!currentBacklog || currentBacklog === 'completed') {
        setCanProgress(false);
        return;
      }

      const { data: tasks, error } = await supabase
        .from("tasks")
        .select("status")
        .eq("project_id", projectId)
        .eq("backlog", currentBacklog as 'business_innovation' | 'engineering' | 'outcomes_adoption');

      if (error || !tasks || tasks.length === 0) {
        setCanProgress(false);
        return;
      }

      const allTasksDone = tasks.every(task => task.status === 'done');
      setCanProgress(allTasksDone);
    } catch (error) {
      console.error("Error checking progression status:", error);
      setCanProgress(false);
    }
  };

  const getNextBacklog = (current: string): string | null => {
    switch (current) {
      case 'business_innovation':
        return 'Engineering';
      case 'engineering':
        return 'Outcomes & Adoption';
      case 'outcomes_adoption':
        return 'Completed';
      default:
        return null;
    }
  };

  const progressProject = async () => {
    setIsLoading(true);
    try {
      const result = await checkAndProgressProjectBacklog(projectId);
      
      if (result) {
        const nextBacklogName = result === 'completed' ? 'Completed Projects' : getNextBacklog(currentBacklog);
        toast({
          title: "Project Progressed",
          description: `Project moved to ${nextBacklogName}`,
        });
        
        // Trigger a refresh by updating the state
        setCanProgress(false);
      } else {
        toast({
          variant: "destructive",
          title: "Cannot Progress",
          description: "Not all tasks are completed yet",
        });
      }
    } catch (error) {
      console.error("Error progressing project:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to progress project",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    canProgress,
    isLoading,
    progressProject,
    nextBacklog: getNextBacklog(currentBacklog),
  };
}
