import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Archive as ArchiveIcon, RotateCcw, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ArchivedIdea {
  id: string;
  idea_id: string;
  title: string;
  description: string;
  possible_outcome: string;
  departments: string[];
  category: string | null;
  user_id: string;
  created_at: string;
  archived_at: string;
}

interface CreatorProfile {
  display_name: string | null;
}

export default function ArchivedIdeasPage() {
  const [ideas, setIdeas] = useState<ArchivedIdea[]>([]);
  const [selectedIdea, setSelectedIdea] = useState<ArchivedIdea | null>(null);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, string>>({});
  const [showIdeaDialog, setShowIdeaDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchArchivedIdeas();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchArchivedIdeas = async () => {
    const { data, error } = await supabase
      .from('archived_ideas')
      .select('*')
      .order('archived_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch archived ideas",
      });
      return;
    }

    setIdeas(data || []);

    // Fetch creator profiles
    const userIds = [...new Set((data || []).map(i => i.user_id).filter(Boolean))];
    const profilesMap: Record<string, string> = {};
    
    for (const userId of userIds) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', userId)
        .single();
      
      if (profile) {
        profilesMap[userId] = profile.display_name || 'Unknown';
      }
    }
    
    setCreatorProfiles(profilesMap);
  };

  const handleRowClick = (idea: ArchivedIdea) => {
    setSelectedIdea(idea);
    setShowIdeaDialog(true);
  };

  const handleRestoreIdea = async () => {
    if (!selectedIdea) return;
    
    setLoading(true);
    try {
      // Get current authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert back into ideas table with current user
      const { error: insertError } = await supabase
        .from('ideas')
        .insert({
          idea_id: selectedIdea.idea_id,
          title: selectedIdea.title,
          description: selectedIdea.description,
          possible_outcome: selectedIdea.possible_outcome,
          departments: selectedIdea.departments,
          category: selectedIdea.category,
          user_id: user.id,
          owner_id: user.id,
          status: 'inbox',
        });

      if (insertError) throw insertError;

      // Delete from archived_ideas
      const { error: deleteError } = await supabase
        .from('archived_ideas')
        .delete()
        .eq('id', selectedIdea.id);

      if (deleteError) throw deleteError;

      toast({
        title: "Success",
        description: "Idea restored successfully",
      });

      setShowRestoreDialog(false);
      setShowIdeaDialog(false);
      fetchArchivedIdeas();
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

  const handleDeleteIdea = async () => {
    if (!selectedIdea) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('archived_ideas')
        .delete()
        .eq('id', selectedIdea.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Idea deleted permanently",
      });

      setShowDeleteDialog(false);
      setShowIdeaDialog(false);
      fetchArchivedIdeas();
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
              <h1 className="text-2xl font-bold text-primary">Archived Ideas</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Idea ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Created At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ideas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <ArchiveIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No archived ideas found</p>
                  </TableCell>
                </TableRow>
              ) : (
                ideas.map((idea) => (
                  <TableRow
                    key={idea.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(idea)}
                  >
                    <TableCell className="font-mono text-xs">{idea.idea_id}</TableCell>
                    <TableCell className="font-medium">{idea.title}</TableCell>
                    <TableCell className="max-w-md">
                      <p className="line-clamp-2">{idea.description}</p>
                    </TableCell>
                    <TableCell>{creatorProfiles[idea.user_id] || 'Unknown'}</TableCell>
                    <TableCell>{new Date(idea.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Idea Details Dialog */}
      <Dialog open={showIdeaDialog} onOpenChange={setShowIdeaDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Idea Details</DialogTitle>
          </DialogHeader>
          {selectedIdea && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Idea ID</label>
                  <p className="font-mono text-sm">{selectedIdea.idea_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <p className="font-medium">{selectedIdea.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm">{selectedIdea.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Possible Outcome</label>
                  <p className="text-sm">{selectedIdea.possible_outcome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Departments</label>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {selectedIdea.departments?.map((dept) => (
                      <Badge key={dept} variant="secondary">{dept}</Badge>
                    ))}
                  </div>
                </div>
                {selectedIdea.category && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Category</label>
                    <p className="text-sm">{selectedIdea.category}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created By</label>
                    <p className="text-sm">{creatorProfiles[selectedIdea.user_id] || 'Unknown'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created At</label>
                    <p className="text-sm">{new Date(selectedIdea.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Archived At</label>
                  <p className="text-sm">{new Date(selectedIdea.archived_at).toLocaleDateString()}</p>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowIdeaDialog(false)}
            >
              Close
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Permanently
            </Button>
            <Button
              onClick={() => setShowRestoreDialog(true)}
              className="bg-primary hover:bg-primary/90"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Idea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Idea</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this idea? It will be moved back to the inbox.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreIdea} disabled={loading}>
              {loading ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Idea Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this idea? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteIdea} 
              disabled={loading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
