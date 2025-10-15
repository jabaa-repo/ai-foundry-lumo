import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User as UserIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import AIChatZone from "@/components/AIChatZone";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'archived';
  due_date: string | null;
  assigned_to: string | null;
  owner_id: string | null;
  idea_id: string | null;
  created_at: string;
  updated_at: string;
  task_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  progress?: number;
}

export default function MyTasks() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchMyTasks(session.user.id);
      } else {
        navigate("/auth");
      }
    });
  }, [navigate]);

  const fetchMyTasks = async (userId: string) => {
    // Fetch all tasks (unassigned and assigned to user)
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .or(`assigned_to.is.null,assigned_to.eq.${userId}`);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch your tasks",
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

  const renderTaskCard = (task: Task) => (
    <Card key={task.id} className="hover:shadow-hover transition-all mb-3">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {task.task_id && <Badge variant="outline">{task.task_id}</Badge>}
              {task.priority && (
                <Badge variant="outline" className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              )}
            </div>
            <CardTitle className="text-base">{task.title}</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {task.description && (
          <p className="text-sm text-muted-foreground">{task.description}</p>
        )}

        <div className="flex items-center gap-6 text-sm">
          {task.due_date && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {task.progress !== undefined && task.progress !== null && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Progress</span>
              <span className="text-xs font-semibold">{task.progress}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div 
                className="bg-primary h-full transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
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
              <h1 className="text-2xl font-bold text-primary">My Task List</h1>
              <p className="text-xs text-muted-foreground">
                {user?.user_metadata?.display_name || user?.email}
              </p>
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

      <AIChatZone />
    </div>
  );
}