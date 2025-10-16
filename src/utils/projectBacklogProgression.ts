import { supabase } from "@/integrations/supabase/client";

export async function checkAndProgressProjectBacklog(projectId: string) {
  try {
    // Get project details
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("backlog")
      .eq("id", projectId)
      .single();

    if (projectError || !project) return;

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("status")
      .eq("project_id", projectId);

    if (tasksError || !tasks || tasks.length === 0) return;

    // Check if all tasks are done
    const allTasksDone = tasks.every(task => task.status === 'done');

    if (allTasksDone) {
      // Determine next backlog
      let nextBacklog: string | null = null;
      
      switch (project.backlog) {
        case 'business_innovation':
          nextBacklog = 'engineering';
          break;
        case 'engineering':
          nextBacklog = 'outcomes_adoption';
          break;
        case 'outcomes_adoption':
          nextBacklog = 'completed';
          break;
        default:
          return; // Already completed or unknown status
      }

      // Update project backlog
      if (nextBacklog === 'completed') {
        // Move to completed status (archive-like state)
        const { error: updateError } = await supabase
          .from("projects")
          .update({ 
            status: 'completed'
          })
          .eq("id", projectId);

        if (!updateError) {
          return 'completed';
        }
      } else {
        // Move to next backlog
        const { error: updateError } = await supabase
          .from("projects")
          .update({ 
            backlog: nextBacklog as 'business_innovation' | 'engineering' | 'outcomes_adoption'
          })
          .eq("id", projectId);

        if (!updateError) {
          return nextBacklog;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error checking project backlog progression:", error);
    return null;
  }
}
