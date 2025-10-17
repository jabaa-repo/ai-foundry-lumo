import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  backlog: 'business_innovation' | 'engineering' | 'outcomes_adoption' | null;
  status: 'todo' | 'in_progress' | 'done';
  assigned_to: string | null;
  responsible_role: string | null;
  accountable_role: string | null;
  due_date: string | null;
}

interface Profile {
  id: string;
  display_name: string | null;
}

interface ProjectTasksTableModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle: string;
}

export default function ProjectTasksTableModal({
  open,
  onOpenChange,
  projectId,
  projectTitle,
}: ProjectTasksTableModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      fetchTasks();
    }
  }, [open, projectId]);

  const fetchTasks = async () => {
    setLoading(true);
    
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (tasksData) {
      setTasks(tasksData as Task[]);

      // Fetch profiles for assigned users
      const userIds = tasksData
        .map(t => t.assigned_to)
        .filter(Boolean) as string[];
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', userIds);

        if (profilesData) {
          const profileMap = new Map<string, string>();
          profilesData.forEach((p: Profile) => {
            profileMap.set(p.id, p.display_name || 'Unknown');
          });
          setProfiles(profileMap);
        }
      }
    }

    setLoading(false);
  };

  const getBacklogLabel = (backlog: string | null) => {
    switch (backlog) {
      case 'business_innovation':
        return 'Business';
      case 'engineering':
        return 'Engineering';
      case 'outcomes_adoption':
        return 'Adoption';
      default:
        return 'N/A';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'todo':
        return 'To Do';
      case 'in_progress':
        return 'In Progress';
      case 'done':
        return 'Done';
      default:
        return status;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case 'done':
        return 'default';
      case 'in_progress':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tasks for {projectTitle}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Task Description</TableHead>
                  <TableHead>Backlog</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Accountable</TableHead>
                  <TableHead>Responsible</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No tasks found
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>
                        <div className="font-medium">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {task.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {getBacklogLabel(task.backlog)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(task.status)} className="text-xs">
                          {getStatusLabel(task.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {task.accountable_role || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {task.assigned_to ? profiles.get(task.assigned_to) : task.responsible_role || '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {task.due_date ? format(new Date(task.due_date), 'MMM dd, yyyy') : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
