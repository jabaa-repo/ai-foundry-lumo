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
  task_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'blocked' | 'done' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  progress: number;
}

export default function MyTasks() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
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
    // Fetch task assignments for this user - cast to any due to pending type generation
    const result = await (supabase as any)
      .from('task_assignments')
      .select('*, tasks(*)')
      .eq('user_id', userId);

    if (result.error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch your tasks",
      });
    } else {
      setAssignments(result.data || []);
      const taskList = (result.data || []).map((a: any) => a.tasks).filter(Boolean);
      setTasks(taskList as any);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-muted';
      case 'in_progress': return 'bg-primary';
      case 'blocked': return 'bg-destructive';
      case 'done': return 'bg-accent';
      default: return 'bg-secondary';
    }
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

      <main className="flex-1 container mx-auto p-4 space-y-4 pb-64">
        <div className="grid gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-hover transition-all">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{task.task_id}</Badge>
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <Badge variant="outline" className={getPriorityColor(task.priority)}>
                        {task.priority}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{task.title}</CardTitle>
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
                  {assignments.find(a => a.tasks?.id === task.id) && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserIcon className="h-4 w-4" />
                      <span>{assignments.find(a => a.tasks?.id === task.id).assigned_role}</span>
                    </div>
                  )}
                </div>

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
              </CardContent>
            </Card>
          ))}

          {tasks.length === 0 && (
            <Card className="p-12">
              <div className="text-center">
                <p className="text-muted-foreground">No tasks assigned to you yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Tasks will appear here when they're assigned to you
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>

      <AIChatZone />
    </div>
  );
}