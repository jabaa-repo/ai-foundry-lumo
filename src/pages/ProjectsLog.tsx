import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, X } from "lucide-react";
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

interface BacklogStats {
  totalTasks: number;
  completedTasks: number;
  unassignedTasks: number;
  inProgressTasks: number;
  completionPercentage: number;
}

interface ProjectStats {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  unassignedTasks: number;
  inProgressTasks: number;
  completionPercentage: number;
  businessInnovation: BacklogStats;
  engineering: BacklogStats;
  adoption: BacklogStats;
}

export default function ProjectsLog() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectStats, setProjectStats] = useState<Map<string, ProjectStats>>(new Map());
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
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
        .select('status, assigned_to, backlog')
        .eq('project_id', project.id);

      const calculateBacklogStats = (backlog: string): BacklogStats => {
        const backlogTasks = tasks?.filter(t => t.backlog === backlog) || [];
        const totalTasks = backlogTasks.length;
        const completedTasks = backlogTasks.filter(t => t.status === 'done').length;
        const unassignedTasks = backlogTasks.filter(t => !t.assigned_to).length;
        const inProgressTasks = backlogTasks.filter(t => t.status === 'in_progress').length;
        const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        
        return {
          totalTasks,
          completedTasks,
          unassignedTasks,
          inProgressTasks,
          completionPercentage,
        };
      };

      const businessInnovation = calculateBacklogStats('business_innovation');
      const engineering = calculateBacklogStats('engineering');
      const adoption = calculateBacklogStats('outcomes_adoption');

      // Weighted completion: Business Innovation 30%, Engineering 50%, Adoption 20%
      const weightedCompletion = Math.round(
        (businessInnovation.completionPercentage * 0.3) +
        (engineering.completionPercentage * 0.5) +
        (adoption.completionPercentage * 0.2)
      );

      const totalTasks = tasks?.length || 0;
      const completedTasks = tasks?.filter(t => t.status === 'done').length || 0;
      const unassignedTasks = tasks?.filter(t => !t.assigned_to).length || 0;
      const inProgressTasks = tasks?.filter(t => t.status === 'in_progress').length || 0;

      statsMap.set(project.id, {
        projectId: project.id,
        totalTasks,
        completedTasks,
        unassignedTasks,
        inProgressTasks,
        completionPercentage: weightedCompletion,
        businessInnovation,
        engineering,
        adoption,
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
              <h1 className="text-2xl font-bold text-primary">Full Projects Log</h1>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`${selectedProject ? 'lg:col-span-2' : 'lg:col-span-3'} bg-card border border-border rounded-lg shadow-soft overflow-hidden`}>
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
                      <TableRow 
                        key={project.id} 
                        className={`hover:bg-muted/50 cursor-pointer ${selectedProject?.id === project.id ? 'bg-muted/50' : ''}`}
                        onClick={() => setSelectedProject(project)}
                      >
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {project.project_number || project.id.slice(0, 8)}
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

            {selectedProject && (
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader className="flex flex-row items-center justify-between pb-3">
                    <CardTitle className="text-lg">Project Details</CardTitle>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setSelectedProject(null)}
                      className="h-6 w-6"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Project ID</p>
                      <Badge variant="outline" className="font-mono text-xs mt-1">
                        {selectedProject.project_number || selectedProject.id.slice(0, 8)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-muted-foreground">Title</p>
                      <p className="text-sm mt-1">{selectedProject.title}</p>
                    </div>
                    
                    <Tabs defaultValue="business_innovation" className="w-full">
                      <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="business_innovation" className="text-xs">Business</TabsTrigger>
                        <TabsTrigger value="engineering" className="text-xs">Engineering</TabsTrigger>
                        <TabsTrigger value="adoption" className="text-xs">Adoption</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="business_innovation" className="space-y-3 mt-4">
                        {(() => {
                          const stats = projectStats.get(selectedProject.id)?.businessInnovation;
                          return (
                            <>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                                  <p className="text-lg font-bold">{stats?.totalTasks || 0}</p>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Unassigned</p>
                                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                    {stats?.unassignedTasks || 0}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">In Progress</p>
                                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    {stats?.inProgressTasks || 0}
                                  </p>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Done</p>
                                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                    {stats?.completedTasks || 0}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-primary/10 p-4 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-2">% Completion (30% weight)</p>
                                <div className="flex items-center gap-3">
                                  <Progress value={stats?.completionPercentage || 0} className="flex-1" />
                                  <span className="text-xl font-bold">{stats?.completionPercentage || 0}%</span>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </TabsContent>

                      <TabsContent value="engineering" className="space-y-3 mt-4">
                        {(() => {
                          const stats = projectStats.get(selectedProject.id)?.engineering;
                          return (
                            <>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                                  <p className="text-lg font-bold">{stats?.totalTasks || 0}</p>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Unassigned</p>
                                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                    {stats?.unassignedTasks || 0}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">In Progress</p>
                                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    {stats?.inProgressTasks || 0}
                                  </p>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Done</p>
                                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                    {stats?.completedTasks || 0}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-primary/10 p-4 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-2">% Completion (50% weight)</p>
                                <div className="flex items-center gap-3">
                                  <Progress value={stats?.completionPercentage || 0} className="flex-1" />
                                  <span className="text-xl font-bold">{stats?.completionPercentage || 0}%</span>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </TabsContent>

                      <TabsContent value="adoption" className="space-y-3 mt-4">
                        {(() => {
                          const stats = projectStats.get(selectedProject.id)?.adoption;
                          return (
                            <>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Total Tasks</p>
                                  <p className="text-lg font-bold">{stats?.totalTasks || 0}</p>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Unassigned</p>
                                  <p className="text-lg font-bold text-orange-600 dark:text-orange-400">
                                    {stats?.unassignedTasks || 0}
                                  </p>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">In Progress</p>
                                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                    {stats?.inProgressTasks || 0}
                                  </p>
                                </div>
                                <div className="bg-muted/50 p-3 rounded-lg">
                                  <p className="text-xs text-muted-foreground">Done</p>
                                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                                    {stats?.completedTasks || 0}
                                  </p>
                                </div>
                              </div>
                              <div className="bg-primary/10 p-4 rounded-lg">
                                <p className="text-xs text-muted-foreground mb-2">% Completion (20% weight)</p>
                                <div className="flex items-center gap-3">
                                  <Progress value={stats?.completionPercentage || 0} className="flex-1" />
                                  <span className="text-xl font-bold">{stats?.completionPercentage || 0}%</span>
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}