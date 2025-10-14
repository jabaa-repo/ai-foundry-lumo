import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Project {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'live' | 'completed' | 'archived';
  primary_metric: any;
  secondary_metrics: any;
  updated_at: string;
}

export default function ProjectsLog() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("recent");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

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

  const filteredProjects = projects.filter((project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.project_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === "recent") return matchesSearch;
    return matchesSearch && project.status === activeTab;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-muted text-muted-foreground';
      case 'live': return 'bg-primary text-primary-foreground';
      case 'completed': return 'bg-accent text-accent-foreground';
      case 'archived': return 'bg-secondary text-secondary-foreground';
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

      <main className="container mx-auto p-4 space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Project ID or Name"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border-border"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="recent">Recent Updates</TabsTrigger>
            <TabsTrigger value="live">Live Projects</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="archived">Archived</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <Card key={project.id} className="hover:shadow-hover transition-all cursor-pointer">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-lg">{project.title}</CardTitle>
                      <Badge className={getStatusColor(project.status)}>
                        {project.status}
                      </Badge>
                    </div>
                    <Badge variant="outline" className="w-fit">
                      {project.project_id}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Latest Update</p>
                      <p className="text-sm line-clamp-2">
                        {project.description || "No description available"}
                      </p>
                    </div>
                    
                    {project.primary_metric && Object.keys(project.primary_metric).length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground">Primary Metric</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                            <div 
                              className="bg-primary h-full transition-all"
                              style={{ width: `${project.primary_metric.value || 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold">
                            {project.primary_metric.value || 0}%
                          </span>
                        </div>
                      </div>
                    )}

                    {project.secondary_metrics && Array.isArray(project.secondary_metrics) && project.secondary_metrics.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Secondary Metrics</p>
                        <div className="flex flex-wrap gap-2">
                          {project.secondary_metrics.slice(0, 3).map((metric: any, idx: number) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {metric.name}: {metric.value}%
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">
                      Updated: {new Date(project.updated_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}

              {filteredProjects.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <p className="text-muted-foreground">No projects found</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}