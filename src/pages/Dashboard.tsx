import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Plus } from "lucide-react";
import KanbanBoard from "@/components/KanbanBoard";
import AIChatZone from "@/components/AIChatZone";
import IdeaDialog from "@/components/IdeaDialog";
import ProjectDialog from "@/components/ProjectDialog";
import MainMenu from "@/components/MainMenu";
import { useToast } from "@/hooks/use-toast";
import huboLogo from "@/assets/hubo-logo.png";

interface Idea {
  id: string;
  idea_id: string;
  title: string;
  description: string;
  possible_outcome: string;
  owner_id: string | null;
  status: 'inbox' | 'business_backlog' | 'engineering_backlog' | 'outcomes_backlog' | 'archived';
  category: string | null;
  created_at: string;
  departments?: string[];
  project_id?: string | null;
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showIdeaDialog, setShowIdeaDialog] = useState(false);
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [activeTasks, setActiveTasks] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchIdeas();
        fetchProjects();
        fetchActiveTasks();
      } else {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        navigate("/auth");
      }
    });

    // Set up realtime subscription for ideas
    const ideasChannel = supabase
      .channel('ideas-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ideas'
        },
        () => fetchIdeas()
      )
      .subscribe();

    // Set up realtime subscription for projects
    const projectsChannel = supabase
      .channel('projects-changes')
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
      subscription.unsubscribe();
      supabase.removeChannel(ideasChannel);
      supabase.removeChannel(projectsChannel);
    };
  }, [navigate]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .neq('status', 'archived')
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

  const fetchIdeas = async () => {
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
      .is('project_id', null)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch ideas",
      });
    } else {
      setIdeas((data || []) as any);
    }
  };

  const fetchActiveTasks = async () => {
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'done');

    setActiveTasks(count || 0);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleAddIdea = () => {
    setSelectedIdea(null);
    setShowIdeaDialog(true);
  };

  const handleIdeaClick = (idea: Idea) => {
    setSelectedIdea(idea);
    setShowIdeaDialog(true);
  };

  const handleProjectClick = (project: any) => {
    setSelectedProject(project);
    setShowProjectDialog(true);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={huboLogo} alt="Hubo" className="h-10 w-auto" />
            <div>
              <h1 className="text-2xl font-bold text-primary">hubo</h1>
              <p className="text-xs text-muted-foreground">From source to success</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-primary text-primary font-semibold">
              Active Tasks: {activeTasks}
            </Badge>
            <MainMenu />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 container mx-auto p-4 space-y-4 pb-64">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground">Project Board</h2>
          <Button
            onClick={handleAddIdea}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-semibold"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add to Inbox
          </Button>
        </div>
        
        <KanbanBoard 
          ideas={ideas} 
          projects={projects} 
          onIdeaClick={handleIdeaClick}
          onProjectClick={handleProjectClick}
        />
      </main>

      {/* AI Chat Zone */}
      <AIChatZone />

      {/* Idea Dialog */}
      <IdeaDialog
        idea={selectedIdea}
        open={showIdeaDialog}
        onOpenChange={setShowIdeaDialog}
        onSuccess={fetchIdeas}
      />

      {/* Project Dialog */}
          <ProjectDialog
            project={selectedProject}
            open={showProjectDialog}
            onOpenChange={setShowProjectDialog}
            onProjectDeleted={() => {
              setShowProjectDialog(false);
              setSelectedProject(null);
              fetchProjects();
            }}
          />
    </div>
  );
}