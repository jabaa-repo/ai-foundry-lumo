import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Archive as ArchiveIcon, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ArchivedItem {
  id: string;
  title: string;
  description: string;
  type: 'idea' | 'project';
  status: string;
  created_at: string;
  updated_at: string;
}

export default function Archive() {
  const [items, setItems] = useState<ArchivedItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchArchivedItems();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchArchivedItems = async () => {
    // Fetch archived ideas
    const { data: ideas, error: ideasError } = await supabase
      .from('ideas')
      .select('*')
      .eq('status', 'archived')
      .order('updated_at', { ascending: false });

    // Fetch archived projects
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'archived')
      .order('updated_at', { ascending: false });

    if (ideasError || projectsError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch archived items",
      });
      return;
    }

    const combined: ArchivedItem[] = [
      ...(ideas || []).map(i => ({ ...i, type: 'idea' as const })),
      ...(projects || []).map(p => ({ ...p, type: 'project' as const }))
    ];

    setItems(combined);
  };

  const filteredItems = items.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-soft sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <ArchiveIcon className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold text-primary">Archive</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search archived items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Items Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Card key={item.id} className="hover:shadow-elegant transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                  <Badge variant="outline" className="capitalize">
                    {item.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {item.description}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Archived: {new Date(item.updated_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-12">
            <ArchiveIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No archived items found</p>
          </div>
        )}
      </main>
    </div>
  );
}
