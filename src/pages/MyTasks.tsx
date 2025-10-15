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

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'archived';
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
}

export default function MyTasks() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectTitle, setProjectTitle] = useState<string>("");
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
    let query = supabase.from('tasks').select('*');
    
    if (projectId) {
      query = query.eq('project_id', projectId);
      
      // Fetch project title
      const { data: projectData } = await supabase
        .from('projects')
        .select('title')
        .eq('id', projectId)
        .single();
      
      if (projectData) {
        setProjectTitle(projectData.title);
      }
    }

    const { data, error } = await query;

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch tasks",
      });
    } else {
      setTasks(data || []);
    }
  };

  const categorizedTasks = {
    unassigned: tasks.filter(t => !t.assigned_to),
    todo: tasks.filter(t => t.assigned_to && t.status === 'todo'),
    inProgress: tasks.filter(t => t.status === 'in_progress'),
    underReview: tasks.filter(t => t.status === 'blocked'),
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
      </CardHeader>
      <CardContent className="space-y-2">
        {task.responsible_role && (
          <div className="text-sm">
            <span className="text-muted-foreground">Responsible: </span>
            <span className="font-medium">{task.responsible_role}</span>
          </div>
        )}
        {task.accountable_role && (
          <div className="text-sm">
            <span className="text-muted-foreground">Accountable: </span>
            <span className="font-medium">{task.accountable_role}</span>
          </div>
        )}
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
            </div>
          </div>
          <Badge variant="outline" className="border-primary text-primary font-semibold">
            {tasks.length} Tasks
          </Badge>
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

          {/* To Do Column */}
          <div className="flex-shrink-0 w-80">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>To Do</span>
                  <Badge variant="secondary">{categorizedTasks.todo.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-250px)] overflow-y-auto">
                {categorizedTasks.todo.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No tasks to do</p>
                ) : (
                  categorizedTasks.todo.map(renderTaskCard)
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

          {/* Under Review Column */}
          <div className="flex-shrink-0 w-80">
            <Card className="h-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <span>Under Review</span>
                  <Badge variant="secondary">{categorizedTasks.underReview.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="max-h-[calc(100vh-250px)] overflow-y-auto">
                {categorizedTasks.underReview.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No tasks under review</p>
                ) : (
                  categorizedTasks.underReview.map(renderTaskCard)
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