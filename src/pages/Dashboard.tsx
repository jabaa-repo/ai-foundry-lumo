import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LogOut, Plus } from "lucide-react";
import KanbanBoard from "@/components/KanbanBoard";
import AIChatZone from "@/components/AIChatZone";
import IdeaDialog from "@/components/IdeaDialog";
import MainMenu from "@/components/MainMenu";
import { useToast } from "@/hooks/use-toast";
import avatarPlaceholder from "@/assets/avatar-placeholder.jpg";

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
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [showIdeaDialog, setShowIdeaDialog] = useState(false);
  const [activeTasks, setActiveTasks] = useState(0);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        fetchIdeas();
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

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchIdeas = async () => {
    const { data, error } = await supabase
      .from('ideas')
      .select('*')
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">LUMO</h1>
            <p className="text-xs text-muted-foreground">An AI-Foundry Product</p>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="border-primary text-primary font-semibold">
              Active Tasks: {activeTasks}
            </Badge>
            <Avatar 
              className="h-10 w-10 cursor-pointer ring-2 ring-primary/20" 
              onClick={() => navigate("/my-tasks")}
            >
              <AvatarImage src={avatarPlaceholder} alt="User avatar" />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.email?.[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
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
        
        <KanbanBoard ideas={ideas} onIdeaClick={handleIdeaClick} />
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
    </div>
  );
}