import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

interface ArchivedProject {
  id: string;
  project_number: string;
  title: string;
  description: string;
  owner_id: string;
  backlog: string;
  created_at: string;
  updated_at: string;
}

interface OwnerProfile {
  display_name: string | null;
}

export default function Archive() {
  const [projects, setProjects] = useState<ArchivedProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<ArchivedProject | null>(null);
  const [ownerProfiles, setOwnerProfiles] = useState<Record<string, string>>({});
  const [showProjectDialog, setShowProjectDialog] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchArchivedProjects();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) navigate("/auth");
  };

  const fetchArchivedProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'archived')
      .order('updated_at', { ascending: false });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch archived projects",
      });
      return;
    }

    setProjects(data || []);

    // Fetch owner profiles
    const ownerIds = [...new Set((data || []).map(p => p.owner_id).filter(Boolean))];
    const profilesMap: Record<string, string> = {};
    
    for (const ownerId of ownerIds) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', ownerId)
        .single();
      
      if (profile) {
        profilesMap[ownerId as string] = profile.display_name || 'Unknown';
      }
    }
    
    setOwnerProfiles(profilesMap);
  };

  const handleRowClick = (project: ArchivedProject) => {
    setSelectedProject(project);
    setShowProjectDialog(true);
  };

  const handleRestoreProject = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .update({ status: 'recent' })
        .eq('id', selectedProject.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project restored successfully",
      });

      setShowRestoreDialog(false);
      setShowProjectDialog(false);
      fetchArchivedProjects();
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

  const handleDeleteProject = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', selectedProject.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Project deleted permanently",
      });

      setShowDeleteDialog(false);
      setShowProjectDialog(false);
      fetchArchivedProjects();
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

  const getBacklogLabel = (backlog: string) => {
    switch (backlog) {
      case 'business_innovation': return 'Business Innovation';
      case 'business_requirements': return 'Business Requirements';
      case 'engineering_in_progress': return 'Engineering In Progress';
      case 'outcomes_delivery': return 'Outcomes Delivery';
      default: return backlog;
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
              <h1 className="text-2xl font-bold text-primary">Archived Projects</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project ID</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Backlog</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Archived</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <ArchiveIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No archived projects found</p>
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow
                    key={project.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleRowClick(project)}
                  >
                    <TableCell className="font-mono text-xs">{project.project_number}</TableCell>
                    <TableCell className="font-medium">{project.title}</TableCell>
                    <TableCell className="max-w-xs truncate">{project.description}</TableCell>
                    <TableCell>{ownerProfiles[project.owner_id] || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getBacklogLabel(project.backlog)}</Badge>
                    </TableCell>
                    <TableCell>{new Date(project.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(project.updated_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>

      {/* Project Details Dialog */}
      <Dialog open={showProjectDialog} onOpenChange={setShowProjectDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Project Details</DialogTitle>
          </DialogHeader>
          {selectedProject && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Project ID</label>
                  <p className="font-mono text-sm">{selectedProject.project_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Title</label>
                  <p className="font-medium">{selectedProject.title}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="text-sm">{selectedProject.description}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Owner</label>
                  <p className="text-sm">{ownerProfiles[selectedProject.owner_id] || 'Unknown'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Backlog</label>
                  <p className="text-sm">{getBacklogLabel(selectedProject.backlog)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Created</label>
                    <p className="text-sm">{new Date(selectedProject.created_at).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Archived</label>
                    <p className="text-sm">{new Date(selectedProject.updated_at).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowProjectDialog(false)}
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
              Restore Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation Dialog */}
      <AlertDialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this project? It will be moved back to the active projects list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestoreProject} disabled={loading}>
              {loading ? "Restoring..." : "Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project Permanently</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this project? This action cannot be undone and will also delete all associated tasks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProject} 
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
