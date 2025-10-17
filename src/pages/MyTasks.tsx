import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User as UserIcon, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AIChatZone from "@/components/AIChatZone";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { MoveToNextBacklogButton } from "@/components/MoveToNextBacklogButton";
import { MoveToCompletedButton } from "@/components/MoveToCompletedButton";
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

interface ResponsibleUser {
  user_id: string;
  profiles: {
    display_name: string | null;
  } | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'unassigned' | 'in_progress' | 'done';
  due_date: string | null;
  start_date?: string | null;
  assigned_to: string | null;
  owner_id: string | null;
  idea_id: string | null;
  created_at: string;
  updated_at: string;
  task_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  progress?: number;
  responsible_role?: string | null;
  accountable_role?: string | null;
  accountable_profile?: {
    display_name: string | null;
  } | null;
  responsible_users?: ResponsibleUser[];
}

export default function MyTasks() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>("");
  const [projectBacklog, setProjectBacklog] = useState<string>("");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const projectId = searchParams.get('projectId');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchMyTasks();
      } else {
        navigate("/auth");
      }
    });
  }, [navigate, projectId]);

  const [projectNumber, setProjectNumber] = useState<string>("");

  const fetchMyTasks = async () => {
    // Fetch tasks for the specific project
    let query = supabase
      .from('tasks')
      .select('*');
    
    if (projectId) {
      // Fetch project title, backlog, status, and project_number
      const { data: projectData } = await supabase
        .from('projects')
        .select('title, backlog, status, project_number')
        .eq('id', projectId)
        .single();
      
      if (projectData) {
        setProjectTitle(projectData.title);
        setProjectBacklog(projectData.backlog || '');
        setProjectNumber(projectData.project_number || '');
        
        // Filter tasks by project
        query = query.eq('project_id', projectId);
        
        // For active projects, only show tasks from current backlog
        // For completed projects, show all tasks from all backlogs
        if (projectData.status !== 'completed') {
          query = query.eq('backlog', projectData.backlog);
        }
      }
    }

    const { data, error } = await query;

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch tasks",
      });
      setTasks([]);
      return;
    }

    // Fetch accountable profiles and responsible users for all tasks
    const tasksWithDetails = await Promise.all(
      (data || []).map(async (task) => {
        // Fetch accountable profile
        let accountable_profile = null;
        if (task.accountable_id) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', task.accountable_id)
            .single();
          accountable_profile = profileData;
        }

        // Fetch responsible users with their profiles separately
        const { data: responsibleLinks } = await supabase
          .from('task_responsible_users')
          .select('user_id')
          .eq('task_id', task.id);

        let responsible_users: ResponsibleUser[] = [];
        if (responsibleLinks && responsibleLinks.length > 0) {
          const userIds = responsibleLinks.map(r => r.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name')
            .in('id', userIds);

          responsible_users = responsibleLinks.map(link => ({
            user_id: link.user_id,
            profiles: profiles?.find(p => p.id === link.user_id) || null
          }));
        }
        
        return {
          ...task,
          accountable_profile,
          responsible_users
        };
      })
    );

    setTasks(tasksWithDetails);
  };

  const categorizedTasks = {
    unassigned: tasks.filter(t => t.status === 'unassigned'),
    inProgress: tasks.filter(t => t.status === 'in_progress'),
    done: tasks.filter(t => t.status === 'done')
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-destructive';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-primary';
      case 'low': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsDialogOpen(true);
  };

  const handleTaskUpdate = () => {
    fetchMyTasks();
  };

  const handleDeleteClick = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskToDelete(task);
    setShowDeleteDialog(true);
  };

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;
    
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskToDelete.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Task deleted permanently",
      });

      fetchMyTasks();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setShowDeleteDialog(false);
      setTaskToDelete(null);
    }
  };

  const renderTaskCard = (task: Task) => (
    <Card 
      key={task.id} 
      className="cursor-pointer hover:shadow-hover transition-all border-border group"
      onClick={() => handleTaskClick(task)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium leading-tight flex-1">
            {task.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => handleDeleteClick(task, e)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {task.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
        
        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
          {task.accountable_profile?.display_name && (
            <div className="flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              <span className="text-foreground">Accountable:</span>
              <span>{task.accountable_profile.display_name}</span>
            </div>
          )}
          {task.responsible_users && task.responsible_users.length > 0 && (
            <div className="flex items-center gap-1">
              <UserIcon className="h-3 w-3" />
              <span className="text-foreground">Responsible:</span>
              <span>
                {task.responsible_users
                  .map(ru => ru.profiles?.display_name || 'Unknown')
                  .join(', ')}
              </span>
            </div>
          )}
          {task.due_date && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary">
                {projectTitle ? `${projectTitle} - Tasks` : 'Tasks'}
              </h1>
              {projectNumber && (
                <Badge variant="outline" className="font-mono text-xs mt-1">
                  {projectNumber}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {projectId && projectBacklog && (
              <>
                <MoveToNextBacklogButton 
                  projectId={projectId}
                  currentBacklog={projectBacklog}
                  onSuccess={fetchMyTasks}
                />
                <MoveToCompletedButton 
                  projectId={projectId}
                  currentBacklog={projectBacklog}
                  canComplete={tasks.length > 0 && tasks.every(t => t.status === 'done')}
                  onSuccess={fetchMyTasks}
                />
              </>
            )}
            <Badge variant="outline" className="border-primary text-primary font-semibold">
              {tasks.length} Tasks
            </Badge>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 pb-64">
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Unassigned Column */}
          <div className="flex-shrink-0 w-80 space-y-3">
            <Card className="bg-muted/50 border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  Unassigned
                  <Badge variant="secondary" className="ml-auto">
                    {categorizedTasks.unassigned.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>

            <div className="space-y-3">
              {categorizedTasks.unassigned.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center">
                    <p className="text-xs text-muted-foreground">No unassigned tasks</p>
                  </CardContent>
                </Card>
              ) : (
                categorizedTasks.unassigned.map(renderTaskCard)
              )}
            </div>
          </div>

          {/* In Progress Column */}
          <div className="flex-shrink-0 w-80 space-y-3">
            <Card className="bg-muted/50 border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  In Progress
                  <Badge variant="secondary" className="ml-auto">
                    {categorizedTasks.inProgress.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>

            <div className="space-y-3">
              {categorizedTasks.inProgress.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center">
                    <p className="text-xs text-muted-foreground">No tasks in progress</p>
                  </CardContent>
                </Card>
              ) : (
                categorizedTasks.inProgress.map(renderTaskCard)
              )}
            </div>
          </div>

          {/* Done Column */}
          <div className="flex-shrink-0 w-80 space-y-3">
            <Card className="bg-muted/50 border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  Done
                  <Badge variant="secondary" className="ml-auto">
                    {categorizedTasks.done.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
            </Card>

            <div className="space-y-3">
              {categorizedTasks.done.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="py-6 text-center">
                    <p className="text-xs text-muted-foreground">No completed tasks</p>
                  </CardContent>
                </Card>
              ) : (
                categorizedTasks.done.map(renderTaskCard)
              )}
            </div>
          </div>
        </div>
      </main>

      <TaskDetailDialog
        task={selectedTask}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onTaskUpdate={handleTaskUpdate}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete "{taskToDelete?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AIChatZone />
    </div>
  );
}