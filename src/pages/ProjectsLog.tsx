import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Search, TrendingUp, Code, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import WorkflowStepIndicator from "@/components/WorkflowStepIndicator";

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

export default function ProjectsLog() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
    
    // Set up realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'projects'
        },
        () => fetchProjects()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('last_activity_date', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch projects",
      });
    } else {
      setProjects((data || []) as any);
    }
  };

  const filteredProjects = projects.filter((project) =>
    project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (project.project_number && project.project_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const projectsByBacklog = {
    business_innovation: filteredProjects.filter(p => p.backlog === 'business_innovation'),
    engineering: filteredProjects.filter(p => p.backlog === 'engineering'),
    outcomes_adoption: filteredProjects.filter(p => p.backlog === 'outcomes_adoption'),
  };

  const getBacklogIcon = (backlog: string) => {
    switch (backlog) {
      case 'business_innovation': return <TrendingUp className="h-5 w-5" />;
      case 'engineering': return <Code className="h-5 w-5" />;
      case 'outcomes_adoption': return <Target className="h-5 w-5" />;
      default: return null;
    }
  };

  const getBacklogTitle = (backlog: string) => {
    switch (backlog) {
      case 'business_innovation': return 'Business Innovation';
      case 'engineering': return 'Engineering';
      case 'outcomes_adoption': return 'Outcomes & Adoption';
      default: return backlog;
    }
  };

  const getBacklogColor = (backlog: string) => {
    switch (backlog) {
      case 'business_innovation': return 'bg-blue-500/10 border-blue-500/20';
      case 'engineering': return 'bg-green-500/10 border-green-500/20';
      case 'outcomes_adoption': return 'bg-purple-500/10 border-purple-500/20';
      default: return 'bg-muted';
    }
  };

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
        <div className="flex items-center gap-4">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(['business_innovation', 'engineering', 'outcomes_adoption'] as const).map((backlog) => (
            <div key={backlog} className="space-y-3">
              <div className={`p-4 rounded-lg border ${getBacklogColor(backlog)}`}>
                <div className="flex items-center gap-2 mb-1">
                  {getBacklogIcon(backlog)}
                  <h3 className="font-bold text-lg">{getBacklogTitle(backlog)}</h3>
                </div>
                <p className="text-xs text-muted-foreground">
                  {projectsByBacklog[backlog].length} {projectsByBacklog[backlog].length === 1 ? 'project' : 'projects'}
                </p>
              </div>

              <div className="space-y-3">
                {projectsByBacklog[backlog].map((project) => (
                  <Card key={project.id} className="hover:shadow-hover transition-all cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-base leading-tight">{project.title}</CardTitle>
                      </div>
                      {project.project_number && (
                        <Badge variant="outline" className="w-fit text-xs">
                          {project.project_number}
                        </Badge>
                      )}
                      {project.workflow_step !== undefined && (
                        <div className="mt-2">
                          <WorkflowStepIndicator step={project.workflow_step} compact />
                        </div>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {project.project_brief && (
                        <div>
                          <p className="text-xs text-muted-foreground">Brief</p>
                          <p className="text-sm line-clamp-2">
                            {project.project_brief}
                          </p>
                        </div>
                      )}

                      {project.desired_outcomes && (
                        <div>
                          <p className="text-xs text-muted-foreground">Outcomes</p>
                          <p className="text-sm line-clamp-2">
                            {project.desired_outcomes}
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">
                        Updated: {new Date(project.last_activity_date || project.updated_at).toLocaleDateString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}

                {projectsByBacklog[backlog].length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">No projects in this backlog</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredProjects.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No projects found matching "{searchTerm}"</p>
          </div>
        )}
      </main>
    </div>
  );
}