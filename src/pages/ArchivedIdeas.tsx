import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Archive, ArrowLeft, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ArchivedIdea {
  id: string;
  title: string;
  description: string;
  possible_outcome: string;
  departments: string[];
  category: string | null;
  archived_at: string;
}

export default function ArchivedIdeas() {
  const [archivedIdeas, setArchivedIdeas] = useState<ArchivedIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchArchivedIdeas();
  }, []);

  const fetchArchivedIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('archived_ideas')
        .select('*')
        .order('archived_at', { ascending: false });

      if (error) throw error;
      setArchivedIdeas(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from('archived_ideas')
        .delete()
        .eq('id', deleteId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Archived idea deleted permanently",
      });

      fetchArchivedIdeas();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Archive className="h-8 w-8 text-primary" />
              Archived Ideas
            </h1>
            <p className="text-muted-foreground mt-1">
              View and manage your archived ideas
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading archived ideas...</p>
          </div>
        ) : archivedIdeas.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Archive className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No archived ideas</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {archivedIdeas.map((idea) => (
              <Card key={idea.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle>{idea.title}</CardTitle>
                      <CardDescription className="mt-2">
                        {idea.description}
                      </CardDescription>
                      {idea.possible_outcome && (
                        <p className="text-sm text-muted-foreground mt-2">
                          <strong>Outcome:</strong> {idea.possible_outcome}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        Archived: {new Date(idea.archived_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteId(idea.id)}
                      className="text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                {idea.departments && idea.departments.length > 0 && (
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {idea.departments.map((dept) => (
                        <Badge key={dept} variant="secondary">
                          {dept}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Archived Idea</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this archived idea? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
