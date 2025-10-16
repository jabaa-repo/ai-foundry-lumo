import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  project_number?: string;
  title: string;
  description: string | null;
  project_brief?: string;
  desired_outcomes?: string;
  backlog?: 'business_innovation' | 'engineering' | 'outcomes_adoption';
  workflow_step?: number;
  status: 'draft' | 'live' | 'completed' | 'archived' | 'recent';
  primary_metric: any;
  secondary_metrics: any;
  updated_at: string;
  last_activity_date?: string;
}

interface ProjectStats {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  unassignedTasks: number;
  inProgressTasks: number;
  completionPercentage: number;
}

export default function ProjectsLog() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<Map<string, ProjectStats>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjectsAndStats();
    
    // Set up realtime subscriptions
    const projectsChannel = supabase
      .channel('projects-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => fetchProjectsAndStats()
      )
      .subscribe();

    const tasksChannel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks'
        },
        () => fetchProjectsAndStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(projectsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, []);

  const fetchProjectsAndStats = async () => {
    setLoading(true);
    
    // Fetch projects
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .neq('status', 'archived')
      .order('last_activity_date', { ascending: false });

    if (projectsError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch projects",
      });
      setLoading(false);
      return;
    }

    setProjects((projectsData || []) as any);

    // Fetch task statistics for all projects
    const statsMap = new Map<string, ProjectStats>();
    
    for (const project of projectsData || []) {
      const { data: tasks } = await supabase
        .from('tasks')
        .select('status, assigned_to')
        .eq('project_id', project.id);

      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
      const unassignedTasks = tasks?.filter(t => !t.assigned_to).length || 0;
      const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;
      const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      statsMap.set(project.id, {
        projectId: project.id,
        totalTasks,
        completedTasks,
        unassignedTasks,
        inProgressTasks,
        completionPercentage,
      });
    }

    setProjectStats(statsMap);
    setLoading(false);
  };

  const filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.project_number && project.project_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-primary">Projects & Outcomes Log</h1>
              <p className="text-xs text-muted-foreground">Track and manage all projects</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Project Number or Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-border"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading projects...</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-lg shadow-soft overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Project ID</TableHead>
                  <TableHead className="font-bold">Title</TableHead>
                  <TableHead className="font-bold text-center">Total Tasks</TableHead>
                  <TableHead className="font-bold text-center">Completed</TableHead>
                  <TableHead className="font-bold text-center">Unassigned</TableHead>
                  <TableHead className="font-bold text-center">In Progress</TableHead>
                  <TableHead className="font-bold">% Completion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProjects.map((project) => {
                  const stats = projectStats.get(project.id);
                  return (
                    <TableRow key={project.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {project.project_number || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{project.title}</TableCell>
                      <TableCell className="text-center">{stats?.totalTasks || 0}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-green-600 dark:text-green-400 font-semibold">
                          {stats?.completedTasks || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-orange-600 dark:text-orange-400 font-semibold">
                          {stats?.unassignedTasks || 0}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {stats?.inProgressTasks || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Progress value={stats?.completionPercentage || 0} className="w-24" />
                          <span className="text-sm font-semibold min-w-[3rem]">
                            {stats?.completionPercentage || 0}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchTerm ? `No projects found matching "${searchTerm}"` : 'No projects found'}
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}