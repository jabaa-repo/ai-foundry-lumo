import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AIChatZone from "@/components/AIChatZone";
import { TaskDetailDialog } from "@/components/TaskDetailDialog";
import { MoveToNextBacklogButton } from "@/components/MoveToNextBacklogButton";

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

  const fetchMyTasks = async () => {
    // Fetch tasks for the specific project
    let query = supabase
      .from('tasks')
      .select('*');
    
    if (projectId) {
      // Fetch project title and backlog
      const { data: projectData } = await supabase
        .from('projects')
        .select('title, backlog')
        .eq('id', projectId)
        .single();
      
      if (projectData) {
        setProjectTitle(projectData.title);
        setProjectBacklog(projectData.backlog || '');
        
        // Filter tasks by project and current backlog
        query = query
          .eq('project_id', projectId)
          .eq('backlog', projectData.backlog);
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
        if (task.assigned_to) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', task.assigned_to)
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

  const renderTaskCard = (task: Task) => (
    <Card 
      key={task.id} 
      className="hover:shadow-hover transition-all mb-3 cursor-pointer"
      onClick={() => handleTaskClick(task)}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{task.title}</CardTitle>
        <div className="space-y-1 mt-2">
          {task.accountable_profile?.display_name && (
            <div className="text-sm">
              <span className="text-muted-foreground">Accountable: </span>
              <span className="font-medium">{task.accountable_profile.display_name}</span>
            </div>
          )}
          {task.responsible_users && task.responsible_users.length > 0 && (
            <div className="text-sm">
              <span className="text-muted-foreground">Responsible: </span>
              <span className="font-medium">
                {task.responsible_users
                  .map(ru => ru.profiles?.display_name || 'Unknown')
                  .join(', ')}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
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
            </div>
          </div>
          <div className="flex items-center gap-2">
            {projectId && projectBacklog && (
              <MoveToNextBacklogButton 
                projectId={projectId}
                currentBacklog={projectBacklog}
                onSuccess={fetchMyTasks}
              />
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
          <div className="flex-shrink-0 w-80">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Unassigned</span>
                  <Badge variant="secondary">{categorizedTasks.unassigned.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-250px)] overflow-y-auto">
                {categorizedTasks.unassigned.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No unassigned tasks</p>
                ) : (
                  categorizedTasks.unassigned.map(renderTaskCard)
                )}
              </CardContent>
            </Card>
          </div>

          {/* In Progress Column */}
          <div className="flex-shrink-0 w-80">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>In Progress</span>
                  <Badge variant="secondary">{categorizedTasks.inProgress.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-250px)] overflow-y-auto">
                {categorizedTasks.inProgress.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No tasks in progress</p>
                ) : (
                  categorizedTasks.inProgress.map(renderTaskCard)
                )}
              </CardContent>
            </Card>
          </div>

          {/* Done Column */}
          <div className="flex-shrink-0 w-80">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Done</span>
                  <Badge variant="secondary">{categorizedTasks.done.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-250px)] overflow-y-auto">
                {categorizedTasks.done.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No completed tasks</p>
                ) : (
                  categorizedTasks.done.map(renderTaskCard)
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <TaskDetailDialog
        task={selectedTask}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onTaskUpdate={handleTaskUpdate}
      />

      <AIChatZone />
    </div>
  );
}